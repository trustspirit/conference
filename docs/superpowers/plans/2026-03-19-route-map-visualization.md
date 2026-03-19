# Route Map Visualization & Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display Kakao Mobility driving route on the map and capture it as PNG for inclusion in expense requests and settlement reports.

**Architecture:** Backend `calculateDistance` returns route path coordinates alongside distance. Frontend draws a Polyline on MiniMap. At form submission, `html2canvas` captures the map to PNG, uploads to Firebase Storage, and links to `TransportDetail.routeMapImage`. PDF export and settlement pages render the stored image.

**Tech Stack:** React 19, TypeScript, Firebase Functions, Kakao Maps SDK, Kakao Mobility API, html2canvas, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-19-route-map-visualization-design.md`

---

### Task 1: Type definitions & dependency setup

**Files:**
- Modify: `apps/finance/src/types/index.ts:16-19` (add RouteMapImage), `:64-72` (extend TransportDetail)
- Modify: `apps/finance/src/kakao.d.ts:16-21` (add Polyline class)
- Modify: `apps/finance/package.json` (add html2canvas)

- [ ] **Step 1: Add `RouteMapImage` interface and extend `TransportDetail`**

In `apps/finance/src/types/index.ts`, add before `TransportDetail`:

```typescript
export interface RouteMapImage {
  storagePath: string
  url: string
}
```

Add to `TransportDetail`:

```typescript
export interface TransportDetail {
  transportType: TransportType
  tripType: TripType
  departure: string
  destination: string
  departureCoord?: PlaceCoord
  destinationCoord?: PlaceCoord
  distanceKm?: number
  routeMapImage?: RouteMapImage
}
```

- [ ] **Step 2: Add Polyline type to `kakao.d.ts`**

In `apps/finance/src/kakao.d.ts`, add inside `declare namespace kakao.maps`:

```typescript
class Polyline {
  constructor(options: {
    map?: Map
    path: LatLng[]
    strokeWeight?: number
    strokeColor?: string
    strokeOpacity?: number
    strokeStyle?: string
  })
  setMap(map: Map | null): void
  setPath(path: LatLng[]): void
}
```

- [ ] **Step 3: Install html2canvas in finance app**

Run: `pnpm --filter @conference/finance add html2canvas`

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/finance/src/types/index.ts apps/finance/src/kakao.d.ts apps/finance/package.json pnpm-lock.yaml
git commit -m "feat: add RouteMapImage type, Polyline typedef, html2canvas dep"
```

---

### Task 2: Backend — `calculateDistance` returns route path

**Files:**
- Modify: `apps/finance/functions/src/index.ts:262-301` (calculateDistance function)

- [ ] **Step 1: Add Douglas-Peucker simplification helper**

Add above the `calculateDistance` function in `apps/finance/functions/src/index.ts`:

```typescript
/**
 * Douglas-Peucker line simplification for [lng, lat, lng, lat, ...] flat arrays.
 * Returns simplified flat array.
 */
function simplifyPath(coords: number[], tolerance = 0.0001): number[] {
  const points: [number, number][] = []
  for (let i = 0; i < coords.length; i += 2) {
    points.push([coords[i], coords[i + 1]])
  }
  if (points.length <= 2) return coords

  function perpendicularDistance(pt: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
    const dx = lineEnd[0] - lineStart[0]
    const dy = lineEnd[1] - lineStart[1]
    const mag = Math.sqrt(dx * dx + dy * dy)
    if (mag === 0) return Math.sqrt((pt[0] - lineStart[0]) ** 2 + (pt[1] - lineStart[1]) ** 2)
    const u = ((pt[0] - lineStart[0]) * dx + (pt[1] - lineStart[1]) * dy) / (mag * mag)
    const closestX = lineStart[0] + u * dx
    const closestY = lineStart[1] + u * dy
    return Math.sqrt((pt[0] - closestX) ** 2 + (pt[1] - closestY) ** 2)
  }

  function simplify(pts: [number, number][], tol: number): [number, number][] {
    if (pts.length <= 2) return pts
    let maxDist = 0
    let maxIdx = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpendicularDistance(pts[i], pts[0], pts[pts.length - 1])
      if (d > maxDist) { maxDist = d; maxIdx = i }
    }
    if (maxDist > tol) {
      const left = simplify(pts.slice(0, maxIdx + 1), tol)
      const right = simplify(pts.slice(maxIdx), tol)
      return [...left.slice(0, -1), ...right]
    }
    return [pts[0], pts[pts.length - 1]]
  }

  const simplified = simplify(points, tolerance)
  const result: number[] = []
  for (const [x, y] of simplified) {
    result.push(x, y)
  }
  return result
}
```

- [ ] **Step 2: Modify `calculateDistance` to extract and return route path**

Update the response type and parsing in `calculateDistance`:

```typescript
export const calculateDistance = onCall(
  { secrets: [kakaoMobilityKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const { origin, destination } = request.data as {
      origin: { lat: number; lng: number }
      destination: { lat: number; lng: number }
    }

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      throw new HttpsError('invalid-argument', 'Origin and destination coordinates are required')
    }

    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`

    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${kakaoMobilityKey.value()}`,
      },
    })

    if (!response.ok) {
      console.error('Kakao Mobility API error:', response.status, await response.text())
      throw new HttpsError('internal', 'Failed to calculate distance')
    }

    const data = await response.json() as {
      routes: {
        result_code: number
        summary: { distance: number }
        sections: { roads: { vertexes: number[] }[] }[]
      }[]
    }
    const routes = data.routes
    if (!routes || routes.length === 0 || routes[0].result_code !== 0) {
      throw new HttpsError('not-found', 'No route found')
    }

    const distanceMeters = routes[0].summary.distance

    // Extract route path coordinates [lng, lat, lng, lat, ...]
    const routePath: number[] = []
    for (const section of routes[0].sections) {
      for (const road of section.roads) {
        routePath.push(...road.vertexes)
      }
    }

    return { distanceMeters, routePath: simplifyPath(routePath) }
  }
)
```

- [ ] **Step 3: Build functions to verify**

Run: `cd apps/finance/functions && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/finance/functions/src/index.ts
git commit -m "feat: return route path coordinates from calculateDistance"
```

---

### Task 3: Backend — `uploadRouteMap` function & cleanup

**Files:**
- Modify: `apps/finance/functions/src/index.ts` (add uploadRouteMap, update cleanupDeletedProjects)

- [ ] **Step 1: Add `uploadRouteMap` Cloud Function**

Add after `uploadBankBookV2` in `apps/finance/functions/src/index.ts`:

```typescript
// 경로맵 업로드
export const uploadRouteMap = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  const { file, committee, projectId } = request.data as {
    file: FileInput
    committee: string
    projectId: string
  }
  if (!file) {
    throw new HttpsError('invalid-argument', 'No file provided')
  }

  const storagePath = `routemaps/${projectId || 'default'}/${committee}/${Date.now()}_route.png`
  return await uploadFileToStorage(file, storagePath)
})
```

- [ ] **Step 2: Update `cleanupDeletedProjects` to clean routemaps**

In `cleanupDeletedProjects`, after the existing orphaned receipts cleanup block (after `await Promise.all(orphanedFiles.map(...))`), add:

```typescript
    // Delete orphaned route map files
    const [orphanedRouteMaps] = await bucket.getFiles({ prefix: `routemaps/${projectId}/` })
    await Promise.all(orphanedRouteMaps.map(f =>
      f.delete().catch(() => { /* ignore */ })
    ))
```

Update the log line to include route map count:

```typescript
    console.log(`Deleted project ${projectId}: ${requests.size} requests, ${settlements.size} settlements, ${storagePaths.length + orphanedFiles.length + orphanedRouteMaps.length} files`)
```

- [ ] **Step 3: Build functions to verify**

Run: `cd apps/finance/functions && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/finance/functions/src/index.ts
git commit -m "feat: add uploadRouteMap function, cleanup routemaps on project delete"
```

---

### Task 4: MiniMap — Polyline route visualization

**Files:**
- Modify: `apps/finance/src/components/MiniMap.tsx` (full rewrite)

- [ ] **Step 1: Rewrite MiniMap with routePath and ref support**

Replace `apps/finance/src/components/MiniMap.tsx` entirely:

```typescript
import { useEffect, useRef } from 'react'
import { PlaceCoord } from '../types'

interface Props {
  departure?: PlaceCoord
  destination?: PlaceCoord
  routePath?: number[]
  ref?: React.Ref<HTMLDivElement>
}

export default function MiniMap({ departure, destination, routePath, ref }: Props) {
  const internalRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const polylineRef = useRef<kakao.maps.Polyline | null>(null)

  // Merge refs: internal + external
  const setRefs = (el: HTMLDivElement | null) => {
    (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (typeof ref === 'function') ref(el)
    else if (ref && typeof ref === 'object') (ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // Initialize map
  useEffect(() => {
    if (!internalRef.current || !window.kakao?.maps) return

    const center = departure
      ? new kakao.maps.LatLng(departure.lat, departure.lng)
      : destination
        ? new kakao.maps.LatLng(destination.lat, destination.lng)
        : new kakao.maps.LatLng(37.5665, 126.978)

    mapRef.current = new kakao.maps.Map(internalRef.current, {
      center,
      level: 7,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers, polyline, and bounds
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    const points: kakao.maps.LatLng[] = []

    if (departure) {
      const pos = new kakao.maps.LatLng(departure.lat, departure.lng)
      points.push(pos)
      const marker = new kakao.maps.Marker({ position: pos, map })
      markersRef.current.push(marker)
    }

    if (destination) {
      const pos = new kakao.maps.LatLng(destination.lat, destination.lng)
      points.push(pos)
      const marker = new kakao.maps.Marker({ position: pos, map })
      markersRef.current.push(marker)
    }

    // Draw polyline if route path exists
    if (routePath && routePath.length >= 4) {
      const path: kakao.maps.LatLng[] = []
      for (let i = 0; i < routePath.length; i += 2) {
        // routePath is [lng, lat, lng, lat, ...]
        path.push(new kakao.maps.LatLng(routePath[i + 1], routePath[i]))
      }
      polylineRef.current = new kakao.maps.Polyline({
        map,
        path,
        strokeWeight: 4,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      })

      // Use polyline path for bounds (more accurate than just markers)
      const bounds = new kakao.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      map.setBounds(bounds, 50, 50, 50, 50)
    } else if (points.length === 2) {
      const bounds = new kakao.maps.LatLngBounds()
      points.forEach((p) => bounds.extend(p))
      map.setBounds(bounds, 50, 50, 50, 50)
    } else if (points.length === 1) {
      map.setCenter(points[0])
      map.setLevel(5)
    }
  }, [departure, destination, routePath])

  const hasRoute = routePath && routePath.length >= 4

  return (
    <div
      ref={setRefs}
      className={`w-full rounded-lg border border-gray-200 overflow-hidden ${hasRoute ? 'h-[200px]' : 'h-[150px]'}`}
    />
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/finance/src/components/MiniMap.tsx
git commit -m "feat: add Polyline route visualization and ref support to MiniMap"
```

---

### Task 5: ItemRow — route path state & miniMapRef

**Files:**
- Modify: `apps/finance/src/components/ItemRow.tsx:12-18` (Props), `:89-120` (useEffect), `:258-264` (MiniMap render)

- [ ] **Step 1: Add `miniMapRef` prop and `routePath` state to ItemRow**

In `apps/finance/src/components/ItemRow.tsx`, update the Props interface:

```typescript
interface Props {
  index: number
  item: RequestItem
  onChange: (index: number, item: RequestItem) => void
  onRemove: (index: number) => void
  canRemove: boolean
  perKmRate?: number
  miniMapRef?: (el: HTMLDivElement | null) => void
}
```

Update the component signature:

```typescript
export default function ItemRow({ index, item, onChange, onRemove, canRemove, perKmRate = DEFAULT_PER_KM_RATE, miniMapRef }: Props) {
```

Add `routePath` state after existing state declarations:

```typescript
const [routePath, setRoutePath] = useState<number[]>()
```

- [ ] **Step 2: Update distance calculation to capture routePath**

In the auto-calculate distance `useEffect` (around line 89), update the `httpsCallable` type and result handling:

Change:
```typescript
    const calcDistance = httpsCallable<
      { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } },
      { distanceMeters: number }
    >(functions, 'calculateDistance')
```

To:
```typescript
    const calcDistance = httpsCallable<
      { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } },
      { distanceMeters: number; routePath: number[] }
    >(functions, 'calculateDistance')
```

In the `.then()` handler, after setting distance, also set routePath:

Change:
```typescript
      .then((result) => {
        if (abortRef.current) return
        const km = Math.round(result.data.distanceMeters / 1000)
        updateTransportDetail({ distanceKm: km })
      })
```

To:
```typescript
      .then((result) => {
        if (abortRef.current) return
        const km = Math.round(result.data.distanceMeters / 1000)
        updateTransportDetail({ distanceKm: km })
        setRoutePath(result.data.routePath)
      })
```

- [ ] **Step 3: Reset routePath when coordinates change**

In the `updateTransportDetail` function, when coordinates are cleared (patch doesn't have coord but clears distance), also reset routePath. Add after the function declaration:

In the existing `useEffect` for distance calculation, add `setRoutePath(undefined)` at the start before setting `isCalculating`:

```typescript
    abortRef.current = false
    setIsCalculating(true)
    setRoutePath(undefined) // Reset route while recalculating
```

- [ ] **Step 4: Pass routePath and miniMapRef to MiniMap**

Update the MiniMap rendering section (around line 258-264):

Change:
```typescript
          {detail.transportType === 'car' && sdkLoaded &&
            (detail.departureCoord || detail.destinationCoord) && (
            <MiniMap
              departure={detail.departureCoord}
              destination={detail.destinationCoord}
            />
          )}
```

To:
```typescript
          {detail.transportType === 'car' && sdkLoaded &&
            (detail.departureCoord || detail.destinationCoord) && (
            <MiniMap
              departure={detail.departureCoord}
              destination={detail.destinationCoord}
              routePath={routePath}
              ref={miniMapRef}
            />
          )}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/finance/src/components/ItemRow.tsx
git commit -m "feat: add routePath state and miniMapRef prop to ItemRow"
```

---

### Task 6: Capture utility — `captureRouteMap.ts`

**Files:**
- Create: `apps/finance/src/lib/captureRouteMap.ts`

- [ ] **Step 1: Create the capture & upload utility**

Create `apps/finance/src/lib/captureRouteMap.ts`:

```typescript
import html2canvas from 'html2canvas'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import { RequestItem } from '../types'

interface FileInput {
  name: string
  data: string
}

interface UploadResult {
  fileName: string
  storagePath: string
  url: string
}

const uploadRouteMapFn = httpsCallable<
  { file: FileInput; committee: string; projectId: string },
  UploadResult
>(functions, 'uploadRouteMap')

/**
 * Capture route map MiniMap elements and upload to Firebase Storage.
 * Returns a new items array with routeMapImage populated for captured items.
 * Capture failures are non-blocking — items without captures proceed without routeMapImage.
 */
export async function captureAndUploadRouteMaps(
  items: RequestItem[],
  miniMapRefs: Map<number, HTMLDivElement>,
  committee: string,
  projectId: string,
): Promise<{ items: RequestItem[]; failedCount: number }> {
  const updatedItems = [...items]
  let failedCount = 0

  for (let i = 0; i < updatedItems.length; i++) {
    const item = updatedItems[i]
    const detail = item.transportDetail
    if (!detail || detail.transportType !== 'car' || !detail.departureCoord || !detail.destinationCoord) {
      continue
    }

    const el = miniMapRefs.get(i)
    if (!el) {
      failedCount++
      continue
    }

    try {
      // Brief delay to ensure any pending renders settle.
      // Map tiles should already be loaded since the user viewed the map
      // while filling the form (well before submission).
      await new Promise((resolve) => setTimeout(resolve, 300))

      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        logging: false,
      })

      // Validate capture: check if canvas is mostly blank
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 50), Math.min(canvas.height, 50))
        const pixels = imageData.data
        let nonWhiteCount = 0
        for (let p = 0; p < pixels.length; p += 4) {
          if (pixels[p] < 240 || pixels[p + 1] < 240 || pixels[p + 2] < 240) {
            nonWhiteCount++
          }
        }
        // If less than 5% of sampled pixels have color, consider it a failed capture
        if (nonWhiteCount < (pixels.length / 4) * 0.05) {
          console.warn(`Route map capture for item ${i} appears blank, skipping`)
          failedCount++
          continue
        }
      }

      const dataUrl = canvas.toDataURL('image/png')
      const result = await uploadRouteMapFn({
        file: { name: `route_${Date.now()}.png`, data: dataUrl },
        committee,
        projectId,
      })

      updatedItems[i] = {
        ...item,
        transportDetail: {
          ...detail,
          routeMapImage: {
            storagePath: result.data.storagePath,
            url: result.data.url,
          },
        },
      }
    } catch (err) {
      console.error(`Route map capture/upload failed for item ${i}:`, err)
      failedCount++
    }
  }

  return { items: updatedItems, failedCount }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/finance/src/lib/captureRouteMap.ts
git commit -m "feat: add captureRouteMap utility for map capture and upload"
```

---

### Task 7: RequestFormPage — integrate capture on submit

**Files:**
- Modify: `apps/finance/src/pages/RequestFormPage.tsx:1-10` (imports), `:219-283` (handleSubmit), `:347-349` (ItemRow render)

- [ ] **Step 1: Add imports and miniMapRefs**

In `apps/finance/src/pages/RequestFormPage.tsx`, add import:

```typescript
import { captureAndUploadRouteMaps } from '../lib/captureRouteMap'
```

Add ref after existing state declarations (around line 86):

```typescript
const miniMapRefs = useRef(new Map<number, HTMLDivElement>())
```

- [ ] **Step 2: Pass miniMapRef callback to ItemRow**

Update each ItemRow render (around line 348):

Change:
```typescript
              <ItemRow key={i} index={i} item={item} onChange={updateItem} onRemove={removeItem}
                canRemove={items.length > 1} perKmRate={currentProject?.perKmRate} />
```

To:
```typescript
              <ItemRow key={i} index={i} item={item} onChange={updateItem} onRemove={removeItem}
                canRemove={items.length > 1} perKmRate={currentProject?.perKmRate}
                miniMapRef={(el) => {
                  if (el) miniMapRefs.current.set(i, el)
                  else miniMapRefs.current.delete(i)
                }} />
```

- [ ] **Step 3: Add route map capture to handleSubmit**

In `handleSubmit`, after receipt upload and before profile updates, add route map capture:

Change the section after `receipts = await uploadReceiptsMutation.mutateAsync(...)`:

```typescript
      // Capture and upload route maps
      const hasCarTransport = validItems.some(
        (item) => item.transportDetail?.transportType === 'car' && item.transportDetail.departureCoord && item.transportDetail.destinationCoord
      )
      let finalItems = validItems
      if (hasCarTransport) {
        const { items: capturedItems, failedCount } = await captureAndUploadRouteMaps(
          validItems,
          miniMapRefs.current,
          committee,
          currentProject!.id,
        )
        finalItems = capturedItems
        if (failedCount > 0) {
          toast({ variant: 'info', message: t('form.routeMapCaptureFailed', { count: failedCount }) })
        }
      }
```

Then update the `createRequest.mutateAsync` call to use `finalItems` instead of `validItems`:

Change `items: validItems,` to `items: finalItems,`
Change `totalAmount: validItems.reduce(...)` to `totalAmount: finalItems.reduce((sum, item) => sum + item.amount, 0),`

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/finance/src/pages/RequestFormPage.tsx
git commit -m "feat: integrate route map capture on request form submission"
```

---

### Task 8: ResubmitPage — integrate capture on submit

**Files:**
- Modify: `apps/finance/src/pages/ResubmitPage.tsx:1-10` (imports), `:156-213` (handleSubmit), `:262-264` (ItemRow render)

- [ ] **Step 1: Add imports and miniMapRefs**

In `apps/finance/src/pages/ResubmitPage.tsx`, add import:

```typescript
import { captureAndUploadRouteMaps } from '../lib/captureRouteMap'
```

Add ref after existing state declarations:

```typescript
const miniMapRefs = useRef(new Map<number, HTMLDivElement>())
```

- [ ] **Step 2: Pass miniMapRef callback to ItemRow**

Update ItemRow render (around line 263):

Change:
```typescript
              <ItemRow key={i} index={i} item={item} onChange={updateItem} onRemove={removeItem}
                canRemove={items.length > 1} perKmRate={currentProject?.perKmRate} />
```

To:
```typescript
              <ItemRow key={i} index={i} item={item} onChange={updateItem} onRemove={removeItem}
                canRemove={items.length > 1} perKmRate={currentProject?.perKmRate}
                miniMapRef={(el) => {
                  if (el) miniMapRefs.current.set(i, el)
                  else miniMapRefs.current.delete(i)
                }} />
```

- [ ] **Step 3: Add route map capture to handleSubmit**

In `handleSubmit` (around line 171), after receipt handling and before profile updates, add:

```typescript
      // Capture and upload route maps
      const hasCarTransport = validItems.some(
        (item) => item.transportDetail?.transportType === 'car' && item.transportDetail.departureCoord && item.transportDetail.destinationCoord
      )
      let finalItems = validItems
      if (hasCarTransport) {
        const { items: capturedItems, failedCount } = await captureAndUploadRouteMaps(
          validItems,
          miniMapRefs.current,
          committee,
          currentProject!.id,
        )
        finalItems = capturedItems
        if (failedCount > 0) {
          toast({ variant: 'info', message: t('form.routeMapCaptureFailed', { count: failedCount }) })
        }
      }
```

Update `createRequest.mutateAsync` to use `finalItems` instead of `validItems`.

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/finance/src/pages/ResubmitPage.tsx
git commit -m "feat: integrate route map capture on resubmit page"
```

---

### Task 9: ItemsTable — show route map thumbnail

**Files:**
- Modify: `apps/finance/src/components/ItemsTable.tsx:29-45` (transport detail section)

- [ ] **Step 1: Add route map image display**

In `apps/finance/src/components/ItemsTable.tsx`, inside the transport detail block (after the departure → destination line, around line 43), add:

```typescript
                    {item.transportDetail.routeMapImage?.url && (
                      <div className="mt-1.5">
                        <a href={item.transportDetail.routeMapImage.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={item.transportDetail.routeMapImage.url}
                            alt={`${item.transportDetail.departure} → ${item.transportDetail.destination}`}
                            className="max-w-[200px] max-h-[120px] rounded border border-gray-200 object-contain bg-gray-50"
                          />
                        </a>
                      </div>
                    )}
```

Insert this before the closing `</div>` of the `bg-blue-50` transport detail container.

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/finance/src/components/ItemsTable.tsx
git commit -m "feat: show route map thumbnail in ItemsTable"
```

---

### Task 10: SettlementReportPage — route map in unified display

**Files:**
- Modify: `apps/finance/src/pages/SettlementReportPage.tsx:241-262` (unified display section)

The `SettlementReportPage` has two display paths:
- **Individual forms** (`needsIndividualForms`): Uses `ItemsTable` which Task 9 already handles.
- **Unified** (single payee/approver): Does NOT render `ItemsTable` — shows only budget summary, signatures, and receipts. Route maps would be invisible in this path.

This task adds route map thumbnails to the unified display path.

- [ ] **Step 1: Add route map images to unified display**

In `apps/finance/src/pages/SettlementReportPage.tsx`, in the unified display section (the `else` branch around line 241), before the `ReceiptGallery`, add a route map section:

```typescript
            {/* Route map images for transport items */}
            {settlements.flatMap(s => s.items).some(item => item.transportDetail?.routeMapImage?.url) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('field.routeMap')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {settlements.flatMap(s => s.items).filter(item => item.transportDetail?.routeMapImage?.url).map((item, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <a href={item.transportDetail!.routeMapImage!.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.transportDetail!.routeMapImage!.url}
                          alt={`${item.transportDetail!.departure} → ${item.transportDetail!.destination}`}
                          className="w-full max-h-[160px] object-contain bg-gray-50"
                        />
                      </a>
                      <div className="px-3 py-1.5 bg-gray-50 border-t text-xs text-gray-600">
                        {item.transportDetail!.departure} → {item.transportDetail!.destination}
                        {item.transportDetail!.distanceKm && ` · ${item.transportDetail!.distanceKm}km`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 2: Add i18n key for route map label**

In `apps/finance/src/locales/ko.json`, add under `field`:
```json
"routeMap": "경로맵"
```

In `apps/finance/src/locales/en.json`, add under `field`:
```json
"routeMap": "Route Map"
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/finance/src/pages/SettlementReportPage.tsx apps/finance/src/locales/ko.json apps/finance/src/locales/en.json
git commit -m "feat: show route map thumbnails in settlement report unified view"
```

---

### Task 11: PDF Export — include route map image

**Files:**
- Modify: `apps/finance/src/lib/pdfExport.ts:163-173` (row building), `:358-370` (individual form rows)

- [ ] **Step 1: Add route map image to transport cost column in PDF**

In `apps/finance/src/lib/pdfExport.ts`, find the section where `transportCost` is built for each row (around line 169-172).

After the existing `transportCost` assignment:
```typescript
          transportCost = `${d.distanceKm}km × ₩${perKmRate} × ${d.tripType === 'round' ? '2' : '1'}<br/>= ₩${cost.toLocaleString()}`
```

Add route map image:
```typescript
          if (d.routeMapImage?.url) {
            transportCost += `<br/><img src="${escapeHtml(d.routeMapImage.url)}" style="max-width:200px; max-height:120px; margin-top:4px; border:1px solid #ddd; border-radius:3px;" onerror="this.style.display='none'" />`
          }
```

- [ ] **Step 2: Apply same change to individual form section**

Find the duplicate transport cost building section in the individual forms loop (around line 365-368). Apply the identical route map image addition after the `tc` variable assignment:

After:
```typescript
            tc = `${d.distanceKm}km × ₩${perKmRate} × ${d.tripType === 'round' ? '2' : '1'}<br/>= ₩${cost.toLocaleString()}`
```

Add:
```typescript
            if (d.routeMapImage?.url) {
              tc += `<br/><img src="${escapeHtml(d.routeMapImage.url)}" style="max-width:200px; max-height:120px; margin-top:4px; border:1px solid #ddd; border-radius:3px;" onerror="this.style.display='none'" />`
            }
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/finance/src/lib/pdfExport.ts
git commit -m "feat: include route map image in PDF export"
```

---

### Task 12: i18n — add translation keys

**Files:**
- Modify: `apps/finance/src/locales/ko.json`
- Modify: `apps/finance/src/locales/en.json`

- [ ] **Step 1: Add Korean translation**

In `apps/finance/src/locales/ko.json`, add under the `form` section:

```json
"routeMapCaptureFailed": "경로맵 캡처 실패 {{count}}건 (제출은 정상 진행)"
```

- [ ] **Step 2: Add English translation**

In `apps/finance/src/locales/en.json`, add under the `form` section:

```json
"routeMapCaptureFailed": "{{count}} route map(s) failed to capture (submission continues)"
```

- [ ] **Step 3: Commit**

```bash
git add apps/finance/src/locales/ko.json apps/finance/src/locales/en.json
git commit -m "feat: add route map capture failure translation keys"
```

---

### Task 13: Build verification & manual testing

**Files:** None (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd apps/finance && pnpm typecheck`
Expected: No errors

- [ ] **Step 2: Build frontend**

Run: `cd apps/finance && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Build functions**

Run: `cd apps/finance/functions && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual test checklist**

Run `pnpm dev` and verify:
1. Select car transport → choose departure → MiniMap shows departure marker
2. Choose destination → MiniMap shows destination marker → distance auto-calculates
3. Distance result → MiniMap shows blue Polyline route with markers
4. Change departure → route recalculates and Polyline updates
5. Submit form → processing overlay shows → route map captured → request created with `routeMapImage`
6. View request detail → route map thumbnail visible in transport item
7. Create settlement → view settlement report → route map visible
8. Export PDF → route map image appears in transport cost column

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
