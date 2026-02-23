import { useState, useCallback, RefObject } from 'react'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../stores/toastStore'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface UseExportPDFOptions {
  filename?: string
  backgroundColor?: string
}

interface UseExportPDFReturn {
  isExporting: boolean
  exportPDF: () => Promise<void>
}

export function useExportPDF(
  elementRef: RefObject<HTMLDivElement | null>,
  options: UseExportPDFOptions = {}
): UseExportPDFReturn {
  const { filename = 'export', backgroundColor = '#F0F2F5' } = options
  const [isExporting, setIsExporting] = useState(false)
  const addToast = useSetAtom(addToastAtom)

  const exportPDF = useCallback(async (): Promise<void> => {
    if (!elementRef.current || isExporting) return

    setIsExporting(true)
    try {
      const element = elementRef.current

      // Use html2canvas to capture the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')

      // A4 dimensions in mm
      const pdfWidth = 210
      const pdfHeight = 297
      const margin = 10

      // Calculate dimensions to fit width
      const contentWidth = pdfWidth - margin * 2
      const imgAspectRatio = canvas.height / canvas.width
      const contentHeight = contentWidth * imgAspectRatio

      // Determine if we need multiple pages
      const maxHeightPerPage = pdfHeight - margin * 2
      const totalPages = Math.ceil(contentHeight / maxHeightPerPage)

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      if (totalPages === 1) {
        // Single page - image fits on one page
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight)
      } else {
        // Multi-page - split the image across pages
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')
        if (!pageCtx) throw new Error('Could not get canvas context')

        // Height of source image per PDF page
        const sourceHeightPerPage = canvas.height / totalPages

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage()

          // Create a canvas for this page's portion
          pageCanvas.width = canvas.width
          pageCanvas.height = Math.min(sourceHeightPerPage, canvas.height - i * sourceHeightPerPage)

          // Draw the portion of the original canvas
          pageCtx.fillStyle = backgroundColor
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          pageCtx.drawImage(
            canvas,
            0,
            i * sourceHeightPerPage,
            canvas.width,
            pageCanvas.height,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          )

          const pageImgData = pageCanvas.toDataURL('image/png')
          const pageContentHeight = (pageCanvas.height / canvas.width) * contentWidth

          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageContentHeight)
        }
      }

      // Generate filename with date
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const fullFilename = `${filename}_${dateStr}.pdf`

      pdf.save(fullFilename)
      addToast({ type: 'success', message: 'PDF exported successfully' })
    } catch (error) {
      console.error('Error exporting PDF:', error)
      addToast({ type: 'error', message: 'Failed to export PDF' })
    } finally {
      setIsExporting(false)
    }
  }, [elementRef, isExporting, filename, backgroundColor, addToast])

  return { isExporting, exportPDF }
}
