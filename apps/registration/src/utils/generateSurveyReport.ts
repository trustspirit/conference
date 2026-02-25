import jsPDF from 'jspdf'

interface ChartImage {
  fieldId: string
  label: string
  imageDataUrl: string
  subtitle?: string
}

interface TextFieldData {
  fieldId: string
  label: string
  responses: string[]
}

interface ReportInput {
  title: string
  description: string
  totalResponses: number
  todayCount: number
  avgPerDay: string
  dailyTrendImage: string
  chartImages: ChartImage[]
  textFields: TextFieldData[]
  generatedAt: Date
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 15
const CONTENT_W = PAGE_W - MARGIN * 2
const COL_W = (CONTENT_W - 8) / 2
const CHART_H = 65
const FOOTER_H = 15

function addPageIfNeeded(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - FOOTER_H) {
    doc.addPage()
    return MARGIN
  }
  return y
}

export function generateSurveyReport(input: ReportInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFont('helvetica')

  let y = MARGIN

  // --- Header section ---
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39) // #111827
  doc.text(input.title, MARGIN, y)
  y += 8

  // Description
  if (input.description) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // #6B7280
    const descLines = doc.splitTextToSize(input.description, CONTENT_W)
    doc.text(descLines, MARGIN, y)
    y += descLines.length * 4 + 2
  }

  // Horizontal line separator
  doc.setDrawColor(229, 231, 235) // #E5E7EB
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += 6

  // KPI row
  const kpiItems = [
    { value: String(input.totalResponses), label: 'Total' },
    { value: String(input.todayCount), label: 'Today' },
    { value: input.avgPerDay, label: 'Avg/Day' },
  ]
  const kpiColW = CONTENT_W / 3

  kpiItems.forEach((item, index) => {
    const centerX = MARGIN + kpiColW * index + kpiColW / 2

    // Large number
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39) // #111827
    doc.text(item.value, centerX, y, { align: 'center' })

    // Small label below
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // #6B7280
    doc.text(item.label, centerX, y + 5, { align: 'center' })
  })

  y += 14

  // --- Daily trend chart ---
  y += 3 // 3mm gap above
  doc.addImage(input.dailyTrendImage, 'PNG', MARGIN, y, CONTENT_W, CHART_H)
  y += CHART_H + 6

  // --- Charts section (2-column grid) ---
  for (let i = 0; i < input.chartImages.length; i += 2) {
    const labelHeight = 6
    const subtitleHeight = 4
    const leftChart = input.chartImages[i]
    const rightChart = input.chartImages[i + 1]

    const leftHasSubtitle = !!leftChart.subtitle
    const rightHasSubtitle = rightChart ? !!rightChart.subtitle : false
    const maxSubtitleH = leftHasSubtitle || rightHasSubtitle ? subtitleHeight : 0
    const rowHeight = labelHeight + maxSubtitleH + CHART_H + 10

    y = addPageIfNeeded(doc, y, rowHeight)

    // Left chart
    const leftX = MARGIN
    let leftY = y

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(55, 65, 81) // #374151
    doc.text(leftChart.label, leftX, leftY)
    leftY += labelHeight

    if (leftChart.subtitle) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128) // #6B7280
      doc.text(leftChart.subtitle, leftX, leftY)
      leftY += subtitleHeight
    } else if (maxSubtitleH > 0) {
      leftY += subtitleHeight
    }

    doc.addImage(leftChart.imageDataUrl, 'PNG', leftX, leftY, COL_W, CHART_H)

    // Right chart (if exists)
    if (rightChart) {
      const rightX = MARGIN + COL_W + 8
      let rightY = y

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(55, 65, 81) // #374151
      doc.text(rightChart.label, rightX, rightY)
      rightY += labelHeight

      if (rightChart.subtitle) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128) // #6B7280
        doc.text(rightChart.subtitle, rightX, rightY)
        rightY += subtitleHeight
      } else if (maxSubtitleH > 0) {
        rightY += subtitleHeight
      }

      doc.addImage(rightChart.imageDataUrl, 'PNG', rightX, rightY, COL_W, CHART_H)
    }

    y += rowHeight
  }

  // --- Text fields section ---
  for (const field of input.textFields) {
    y = addPageIfNeeded(doc, y, 20)

    // Field label
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(55, 65, 81) // #374151
    doc.text(field.label, MARGIN, y)
    y += 5

    // Horizontal line
    doc.setDrawColor(229, 231, 235) // #E5E7EB
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
    y += 4

    // Response items (max 20)
    const items = field.responses.slice(0, 20)

    for (const item of items) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(75, 85, 99) // #4B5563

      const wrappedLines: string[] = doc.splitTextToSize(item, CONTENT_W)
      const itemHeight = wrappedLines.length * 3.5 + 2

      y = addPageIfNeeded(doc, y, itemHeight)

      doc.text(wrappedLines, MARGIN, y)
      y += itemHeight
    }

    y += 6 // 6mm gap between fields
  }

  // --- Footer on every page ---
  const totalPages = doc.getNumberOfPages()
  const generatedDateStr = input.generatedAt.toLocaleDateString()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // #6B7280

    // Center: page number
    doc.text(`Page ${i} / ${totalPages}`, PAGE_W / 2, PAGE_H - 10, {
      align: 'center',
    })

    // Right: generated date
    doc.text(generatedDateStr, PAGE_W - MARGIN, PAGE_H - 10, {
      align: 'right',
    })
  }

  // --- Save ---
  doc.save(`${input.title}_Report.pdf`)
}
