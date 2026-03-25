import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import { RequestItem, PlaceCoord } from '../types'

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

const WIDTH = 600
const HEIGHT = 400
const PADDING = 50

/**
 * Draw a route map on a canvas using departure/destination coordinates.
 * Extracts the Kakao Maps internal canvas if available, otherwise renders
 * a simple diagram with the route line and markers.
 */
function drawRouteMap(
  mapEl: HTMLDivElement,
  dep: PlaceCoord,
  dest: PlaceCoord,
  depName: string,
  destName: string,
  distanceKm?: number
): string {
  // Try to grab the Kakao Maps internal canvas directly (no CORS issues)
  const mapCanvas = mapEl.querySelector('canvas')
  if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
    try {
      const combined = document.createElement('canvas')
      combined.width = mapCanvas.width
      combined.height = mapCanvas.height
      const cctx = combined.getContext('2d')!
      cctx.drawImage(mapCanvas, 0, 0)
      const dataUrl = combined.toDataURL('image/png')
      // Verify it's not blank
      if (dataUrl.length > 1000) return dataUrl
    } catch {
      // Canvas may be tainted — fall through to manual drawing
    }
  }

  // Fallback: draw a clean route diagram using Canvas 2D
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Grid lines for context
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 0.5
  for (let x = PADDING; x <= WIDTH - PADDING; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, PADDING)
    ctx.lineTo(x, HEIGHT - PADDING)
    ctx.stroke()
  }
  for (let y = PADDING; y <= HEIGHT - PADDING; y += 40) {
    ctx.beginPath()
    ctx.moveTo(PADDING, y)
    ctx.lineTo(WIDTH - PADDING, y)
    ctx.stroke()
  }

  // Project coordinates to canvas pixels
  const allLats = [dep.lat, dest.lat]
  const allLngs = [dep.lng, dest.lng]
  const minLat = Math.min(...allLats)
  const maxLat = Math.max(...allLats)
  const minLng = Math.min(...allLngs)
  const maxLng = Math.max(...allLngs)
  const latSpan = maxLat - minLat || 0.01
  const lngSpan = maxLng - minLng || 0.01

  const drawW = WIDTH - PADDING * 2
  const drawH = HEIGHT - PADDING * 2

  const toX = (lng: number) => PADDING + ((lng - minLng) / lngSpan) * drawW
  const toY = (lat: number) => HEIGHT - PADDING - ((lat - minLat) / latSpan) * drawH

  const depX = toX(dep.lng)
  const depY = toY(dep.lat)
  const destX = toX(dest.lng)
  const destY = toY(dest.lat)

  // Route line
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  ctx.setLineDash([8, 4])
  ctx.beginPath()
  ctx.moveTo(depX, depY)
  ctx.lineTo(destX, destY)
  ctx.stroke()
  ctx.setLineDash([])

  // Departure marker (blue circle)
  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  ctx.arc(depX, depY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A', depX, depY)

  // Destination marker (red circle)
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.arc(destX, destY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText('B', destX, destY)

  // Labels
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1e293b'
  ctx.fillText(`A: ${depName}`, depX + 14, depY + 4)
  ctx.fillText(`B: ${destName}`, destX + 14, destY + 4)

  // Distance label at midpoint
  if (distanceKm) {
    const midX = (depX + destX) / 2
    const midY = (depY + destY) / 2
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1e40af'
    ctx.fillText(`${distanceKm} km`, midX, midY - 12)
  }

  // Border
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, WIDTH, HEIGHT)

  return canvas.toDataURL('image/png')
}

/**
 * Capture route maps and upload to Firebase Storage.
 * Returns a new items array with routeMapImage populated for captured items.
 * Capture failures are non-blocking — items without captures proceed without routeMapImage.
 */
export async function captureAndUploadRouteMaps(
  items: RequestItem[],
  miniMapRefs: Map<number, HTMLDivElement>,
  committee: string,
  projectId: string
): Promise<{ items: RequestItem[]; failedCount: number }> {
  const updatedItems = [...items]
  let failedCount = 0

  for (let i = 0; i < updatedItems.length; i++) {
    const item = updatedItems[i]
    const detail = item.transportDetail
    if (
      !detail ||
      detail.transportType !== 'car' ||
      !detail.departureCoord ||
      !detail.destinationCoord
    ) {
      continue
    }

    try {
      const el = miniMapRefs.get(i)
      const dataUrl = drawRouteMap(
        el || document.createElement('div'),
        detail.departureCoord,
        detail.destinationCoord,
        detail.departure,
        detail.destination,
        detail.distanceKm
      )

      const result = await uploadRouteMapFn({
        file: { name: `route_${Date.now()}.png`, data: dataUrl },
        committee,
        projectId
      })

      updatedItems[i] = {
        ...item,
        transportDetail: {
          ...detail,
          routeMapImage: {
            storagePath: result.data.storagePath,
            url: result.data.url
          }
        }
      }
    } catch (err) {
      console.error(`Route map capture/upload failed for item ${i}:`, err)
      failedCount++
    }
  }

  return { items: updatedItems, failedCount }
}
