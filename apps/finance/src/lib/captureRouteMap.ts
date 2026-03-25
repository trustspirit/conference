import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import { RequestItem } from '../types'

interface UploadResult {
  fileName: string
  storagePath: string
  url: string
}

const generateRouteMapFn = httpsCallable<
  {
    dep: { lat: number; lng: number }
    dest: { lat: number; lng: number }
    depName: string
    destName: string
    distanceKm?: number
    routePath?: number[]
    committee: string
    projectId: string
  },
  UploadResult
>(functions, 'generateRouteMap')

/**
 * Generate route map images server-side (Kakao map tiles + route overlay)
 * and upload to Firebase Storage.
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
      const result = await generateRouteMapFn({
        dep: detail.departureCoord,
        dest: detail.destinationCoord,
        depName: detail.departure,
        destName: detail.destination,
        distanceKm: detail.distanceKm,
        routePath: routePaths.get(i),
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
