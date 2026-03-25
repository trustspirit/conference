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
const PADDING = 60

/**
 * Draw a route map on a canvas using coordinates and route path.
 */
function drawRouteMap(
  dep: PlaceCoord,
  dest: PlaceCoord,
  depName: string,
  destName: string,
  distanceKm?: number,
  routePath?: number[]
): string {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // Collect all points for bounding box
  const lats: number[] = [dep.lat, dest.lat]
  const lngs: number[] = [dep.lng, dest.lng]
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
  const latSpan = maxLat - minLat || 0.01
  const lngSpan = maxLng - minLng || 0.01

  // Add 15% margin around the bounding box
  const marginLat = latSpan * 0.15
  const marginLng = lngSpan * 0.15
  const adjMinLat = minLat - marginLat
  const adjMaxLat = maxLat + marginLat
  const adjMinLng = minLng - marginLng
  const adjMaxLng = maxLng + marginLng
  const adjLatSpan = adjMaxLat - adjMinLat
  const adjLngSpan = adjMaxLng - adjMinLng

  const drawW = WIDTH - PADDING * 2
  const drawH = HEIGHT - PADDING * 2

  const toX = (lng: number) => PADDING + ((lng - adjMinLng) / adjLngSpan) * drawW
  const toY = (lat: number) => HEIGHT - PADDING - ((lat - adjMinLat) / adjLatSpan) * drawH

  // Background
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Grid
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

  // Draw route
  if (routePath && routePath.length >= 4) {
    // Actual route polyline from Kakao Directions API
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(toX(routePath[0]), toY(routePath[1]))
    for (let i = 2; i < routePath.length; i += 2) {
      ctx.lineTo(toX(routePath[i]), toY(routePath[i + 1]))
    }
    ctx.stroke()
  } else {
    // Fallback: dashed straight line
    ctx.strokeStyle = '#3b82f6'
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

  // Departure marker (blue)
  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  ctx.arc(depX, depY, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A', depX, depY)

  // Destination marker (red)
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.arc(destX, destY, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.fillText('B', destX, destY)

  // Labels with background
  const drawLabel = (text: string, x: number, y: number) => {
    ctx.font = '12px sans-serif'
    const metrics = ctx.measureText(text)
    const lx = x + 16
    const ly = y - 6
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(lx - 3, ly - 11, metrics.width + 6, 16)
    ctx.fillStyle = '#1e293b'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, lx, ly)
  }
  drawLabel(depName, depX, depY)
  drawLabel(destName, destX, destY)

  // Distance badge at midpoint
  if (distanceKm) {
    const midX = (depX + destX) / 2
    const midY = (depY + destY) / 2
    const label = `${distanceKm} km`
    ctx.font = 'bold 14px sans-serif'
    const m = ctx.measureText(label)
    const bw = m.width + 16
    const bh = 24
    ctx.fillStyle = '#1e40af'
    ctx.beginPath()
    ctx.roundRect(midX - bw / 2, midY - bh / 2 - 14, bw, bh, 4)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, midX, midY - 14)
  }

  // Border
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.strokeRect(0, 0, WIDTH, HEIGHT)

  return canvas.toDataURL('image/png')
}

/**
 * Generate route map images and upload to Firebase Storage.
 * Uses Canvas 2D to draw the actual route path (from Kakao Directions API).
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
      const dataUrl = drawRouteMap(
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
      console.error(`Route map capture/upload failed for item ${i}:`, err)
      failedCount++
    }
  }

  return { items: updatedItems, failedCount }
}
