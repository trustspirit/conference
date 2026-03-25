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
        logging: false
      })

      // Validate capture: check if canvas is mostly blank
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.getImageData(
          0,
          0,
          Math.min(canvas.width, 50),
          Math.min(canvas.height, 50)
        )
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
