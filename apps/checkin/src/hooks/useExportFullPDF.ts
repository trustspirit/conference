import { useState, useCallback, RefObject } from 'react'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../stores/toastStore'
import jsPDF from 'jspdf'
import domToImage from 'dom-to-image-more'

// CSS properties to inline for PDF export
const CSS_PROPERTIES_TO_INLINE = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',
  'letter-spacing',
  'white-space',
  'word-wrap',
  'word-break',
  'flex',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'grid',
  'grid-template-columns',
  'grid-template-rows',
  'grid-gap',
  'gap',
  'box-shadow',
  'opacity',
  'z-index',
  'transform',
  'transition',
  'overflow',
  'overflow-x',
  'overflow-y',
  'visibility',
  'table-layout',
  'border-collapse',
  'border-spacing',
  'vertical-align',
  'cursor',
  'outline',
  'box-sizing'
] as const

// A4 dimensions in mm
const PDF_DIMENSIONS = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 }
} as const

const PDF_MARGIN = 10

interface UseExportFullPDFOptions {
  filename?: string
  backgroundColor?: string
  orientation?: 'portrait' | 'landscape'
}

interface UseExportFullPDFReturn {
  isExporting: boolean
  exportFullPDF: () => Promise<void>
}

/**
 * Inline computed styles from source element to target element
 */
function inlineComputedStyles(source: HTMLElement, target: HTMLElement): void {
  const computedStyle = window.getComputedStyle(source)

  CSS_PROPERTIES_TO_INLINE.forEach((prop) => {
    const value = computedStyle.getPropertyValue(prop)
    if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px') {
      target.style.setProperty(prop, value)
    }
  })

  // Expand scrollable areas
  if (
    computedStyle.overflow === 'auto' ||
    computedStyle.overflow === 'scroll' ||
    computedStyle.overflowY === 'auto' ||
    computedStyle.overflowY === 'scroll'
  ) {
    target.style.height = 'auto'
    target.style.maxHeight = 'none'
    target.style.overflow = 'visible'
  }
}

/**
 * Create an offscreen container for capturing
 */
function createCaptureContainer(width: number, backgroundColor: string): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.top = '0'
  container.style.width = `${width}px`
  container.style.backgroundColor = backgroundColor
  container.style.zIndex = '-9999'
  container.style.opacity = '0'
  container.style.pointerEvents = 'none'
  return container
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Create PDF from image data
 */
function createPDFFromImage(
  dataUrl: string,
  img: HTMLImageElement,
  orientation: 'portrait' | 'landscape',
  backgroundColor: string
): jsPDF {
  const { width: pdfWidth, height: pdfHeight } = PDF_DIMENSIONS[orientation]
  const contentWidth = pdfWidth - PDF_MARGIN * 2
  const imgAspectRatio = img.height / img.width
  const contentHeight = contentWidth * imgAspectRatio
  const maxHeightPerPage = pdfHeight - PDF_MARGIN * 2
  const totalPages = Math.ceil(contentHeight / maxHeightPerPage)

  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

  if (totalPages === 1) {
    pdf.addImage(dataUrl, 'PNG', PDF_MARGIN, PDF_MARGIN, contentWidth, contentHeight)
  } else {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    const sourceHeightPerPage = img.height / totalPages

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage()

      const pageCanvas = document.createElement('canvas')
      const pageCtx = pageCanvas.getContext('2d')
      if (!pageCtx) throw new Error('Could not get page canvas context')

      pageCanvas.width = img.width
      pageCanvas.height = Math.min(sourceHeightPerPage, img.height - i * sourceHeightPerPage)

      pageCtx.fillStyle = backgroundColor
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      pageCtx.drawImage(
        canvas,
        0,
        i * sourceHeightPerPage,
        img.width,
        pageCanvas.height,
        0,
        0,
        pageCanvas.width,
        pageCanvas.height
      )

      const pageImgData = pageCanvas.toDataURL('image/png')
      const pageContentHeight = (pageCanvas.height / img.width) * contentWidth
      pdf.addImage(pageImgData, 'PNG', PDF_MARGIN, PDF_MARGIN, contentWidth, pageContentHeight)
    }
  }

  return pdf
}

export function useExportFullPDF(
  elementRef: RefObject<HTMLDivElement | null>,
  options: UseExportFullPDFOptions = {}
): UseExportFullPDFReturn {
  const { filename = 'export', backgroundColor = '#FFFFFF', orientation = 'landscape' } = options
  const [isExporting, setIsExporting] = useState(false)
  const addToast = useSetAtom(addToastAtom)

  const exportFullPDF = useCallback(async (): Promise<void> => {
    if (!elementRef.current || isExporting) return

    setIsExporting(true)
    try {
      const element = elementRef.current
      const clone = element.cloneNode(true) as HTMLElement

      // Setup clone styles
      clone.style.height = 'auto'
      clone.style.maxHeight = 'none'
      clone.style.overflow = 'visible'
      clone.style.width = '100%'

      // Inline styles from source to clone
      inlineComputedStyles(element, clone)

      const sourceChildren = element.querySelectorAll('*')
      const cloneChildren = clone.querySelectorAll('*')
      sourceChildren.forEach((sourceEl, index) => {
        const targetEl = cloneChildren[index] as HTMLElement
        if (targetEl && sourceEl instanceof HTMLElement) {
          inlineComputedStyles(sourceEl, targetEl)
        }
      })

      // Create container and append clone
      const container = createCaptureContainer(element.scrollWidth, backgroundColor)
      container.appendChild(clone)
      document.body.appendChild(container)

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Capture image
      const dataUrl = await domToImage.toPng(clone, {
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        style: { transform: 'scale(1)', transformOrigin: 'top left' },
        bgcolor: backgroundColor
      })

      // Cleanup
      document.body.removeChild(container)

      // Create PDF
      const img = await loadImage(dataUrl)
      const pdf = createPDFFromImage(dataUrl, img, orientation, backgroundColor)

      // Save
      const dateStr = new Date().toISOString().split('T')[0]
      pdf.save(`${filename}_${dateStr}.pdf`)
      addToast({ type: 'success', message: 'PDF exported successfully' })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      addToast({
        type: 'error',
        message: `PDF 내보내기 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsExporting(false)
    }
  }, [elementRef, isExporting, filename, backgroundColor, orientation, addToast])

  return { isExporting, exportFullPDF }
}
