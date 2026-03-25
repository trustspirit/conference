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
const TILE_SIZE = 256

// ── Slippy-map tile math (Web Mercator) ──

function lat2y(lat: number): number {
  const rad = (lat * Math.PI) / 180
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2
}

function lngToTileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom)
}

function latToTileY(lat: number, zoom: number): number {
  return lat2y(lat) * Math.pow(2, zoom)
}

function fitZoom(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): number {
  for (let z = 16; z >= 2; z--) {
    const x0 = lngToTileX(minLng, z) * TILE_SIZE
    const x1 = lngToTileX(maxLng, z) * TILE_SIZE
    const y0 = latToTileY(maxLat, z) * TILE_SIZE
    const y1 = latToTileY(minLat, z) * TILE_SIZE
    if (x1 - x0 < WIDTH * 0.8 && y1 - y0 < HEIGHT * 0.8) return z
  }
  return 2
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Tile load failed: ${url}`))
    img.src = url
  })
}

/**
 * Draw a route map with OSM tile background and route overlay.
 */
async function drawRouteMap(
  dep: PlaceCoord,
  dest: PlaceCoord,
  depName: string,
  destName: string,
  distanceKm?: number,
  routePath?: number[]
): Promise<string> {
  const lats = [dep.lat, dest.lat]
  const lngs = [dep.lng, dest.lng]
  if (routePath && routePath.length >= 4) {
    for (let i = 0; i < routePath.length; i += 2) {
      lngs.push(routePath[i])
      lats.push(routePath[i + 1])
    }
  }

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const zoom = fitZoom(minLat, maxLat, minLng, maxLng)
  const n = Math.pow(2, zoom)
  const centerWX = lngToTileX((minLng + maxLng) / 2, zoom) * TILE_SIZE
  const centerWY = latToTileY((minLat + maxLat) / 2, zoom) * TILE_SIZE
  const originWX = centerWX - WIDTH / 2
  const originWY = centerWY - HEIGHT / 2

  const toX = (lng: number) => lngToTileX(lng, zoom) * TILE_SIZE - originWX
  const toY = (lat: number) => latToTileY(lat, zoom) * TILE_SIZE - originWY

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // ── Load and draw OSM tiles ──
  const tileXMin = Math.floor(originWX / TILE_SIZE)
  const tileXMax = Math.floor((originWX + WIDTH) / TILE_SIZE)
  const tileYMin = Math.floor(originWY / TILE_SIZE)
  const tileYMax = Math.floor((originWY + HEIGHT) / TILE_SIZE)

  const tileResults: { img: HTMLImageElement; dx: number; dy: number }[] = []
  const promises: Promise<void>[] = []

  for (let tx = tileXMin; tx <= tileXMax; tx++) {
    for (let ty = tileYMin; ty <= tileYMax; ty++) {
      const wrappedTx = ((tx % n) + n) % n
      if (ty < 0 || ty >= n) continue
      const url = `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`
      const dx = tx * TILE_SIZE - originWX
      const dy = ty * TILE_SIZE - originWY
      promises.push(
        loadImage(url)
          .then((img) => { tileResults.push({ img, dx, dy }) })
          .catch(() => {})
      )
    }
  }
  await Promise.all(promises)

  // Draw tiles (must be on main thread after all loaded)
  for (const { img, dx, dy } of tileResults) {
    ctx.drawImage(img, dx, dy, TILE_SIZE, TILE_SIZE)
  }

  // ── Draw route ──
  if (routePath && routePath.length >= 4) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 6
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(toX(routePath[0]), toY(routePath[1]))
    for (let i = 2; i < routePath.length; i += 2) {
      ctx.lineTo(toX(routePath[i]), toY(routePath[i + 1]))
    }
    ctx.stroke()

    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(toX(routePath[0]), toY(routePath[1]))
    for (let i = 2; i < routePath.length; i += 2) {
      ctx.lineTo(toX(routePath[i]), toY(routePath[i + 1]))
    }
    ctx.stroke()
  } else {
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(toX(dep.lng), toY(dep.lat))
    ctx.lineTo(toX(dest.lng), toY(dest.lat))
    ctx.stroke()
    ctx.setLineDash([])
  }

  const depX = toX(dep.lng)
  const depY = toY(dep.lat)
  const destX = toX(dest.lng)
  const destY = toY(dest.lat)

  // ── Markers ──
  const drawMarker = (x: number, y: number, color: string, letter: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(letter, x, y)
  }
  drawMarker(depX, depY, '#2563eb', 'A')
  drawMarker(destX, destY, '#dc2626', 'B')

  // ── Labels ──
  const drawLabel = (text: string, x: number, y: number) => {
    ctx.font = 'bold 12px sans-serif'
    const metrics = ctx.measureText(text)
    const lx = x + 18
    const ly = y
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.roundRect(lx - 4, ly - 10, metrics.width + 8, 20, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#1e293b'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, lx, ly)
  }
  drawLabel(depName, depX, depY)
  drawLabel(destName, destX, destY)

  // ── Distance badge ──
  if (distanceKm) {
    const midX = (depX + destX) / 2
    const midY = (depY + destY) / 2
    const label = `${distanceKm} km`
    ctx.font = 'bold 14px sans-serif'
    const m = ctx.measureText(label)
    const bw = m.width + 20
    const bh = 28
    ctx.fillStyle = '#1e40af'
    ctx.beginPath()
    ctx.roundRect(midX - bw / 2, midY - bh / 2 - 16, bw, bh, 6)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, midX, midY - 16)
  }

  // ── OSM attribution ──
  ctx.font = '9px sans-serif'
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText('© OpenStreetMap contributors', WIDTH - 4, HEIGHT - 2)

  return canvas.toDataURL('image/png')
}

/**
 * Generate route map images with OSM map background and upload to Firebase Storage.
 */
export async function captureAndUploadRouteMaps(
  items: RequestItem[],
  routePaths: Map<number, number[]>,
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
      const dataUrl = await drawRouteMap(
        detail.departureCoord,
        detail.destinationCoord,
        detail.departure,
        detail.destination,
        detail.distanceKm,
        routePaths.get(i)
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
      console.error(`Route map generation failed for item ${i}:`, err)
      failedCount++
    }
  }

  return { items: updatedItems, failedCount }
}
