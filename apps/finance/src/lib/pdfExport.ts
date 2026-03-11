import { httpsCallable } from 'firebase/functions'
import * as pdfjsLib from 'pdfjs-dist'
import { Settlement, Receipt } from '../types'
import { functions } from '@conference/firebase'
import i18n from './i18n'
import { formatFirestoreDate } from './utils'
import { UNIQUE_BUDGET_CODES } from '../constants/budgetCodes'
import { calcCarTransportAmount, DEFAULT_PER_KM_RATE } from '../components/ItemRow'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts)

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function pdfPageToDataUrl(base64Data: string): Promise<string | null> {
  try {
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    const page = await pdf.getPage(1)
    const scale = 2
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, viewport } as never).promise
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

async function preloadReceipts(receipts: Receipt[]) {
  const downloadFn = httpsCallable<
    { storagePath: string },
    { data: string; contentType: string; fileName: string }
  >(functions, 'downloadFileV2')

  return Promise.all(
    receipts.map(async (r): Promise<{ fileName: string; dataUrl: string | null }> => {
      try {
        if (!r.storagePath) return { fileName: r.fileName, dataUrl: null }

        const result = await downloadFn({ storagePath: r.storagePath })
        const { data, contentType } = result.data
        const isPdf = r.fileName.toLowerCase().endsWith('.pdf')

        if (isPdf) {
          const pageDataUrl = await pdfPageToDataUrl(data)
          return { fileName: r.fileName, dataUrl: pageDataUrl }
        }

        return { fileName: r.fileName, dataUrl: `data:${contentType};base64,${data}` }
      } catch {
        return { fileName: r.fileName, dataUrl: null }
      }
    })
  )
}

function buildPdfStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif; font-size: 12px; color: #333; padding: 15mm; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-bottom: 12px; }
    .subtitle { text-align: center; color: #666; font-size: 11px; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 20px; font-size: 12px; }
    .info-grid .label { color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
    th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .total-row { font-weight: 700; background: #f9f9f9; }
    .page-break { page-break-before: always; }
    .receipt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .receipt-card { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; break-inside: avoid; position: relative; }
    .receipt-card img { width: 100%; max-height: 350px; object-fit: contain; background: #f9f9f9; display: block; }
    .receipt-name { font-size: 9px; color: #666; padding: 4px 6px; background: #f5f5f5; border-top: 1px solid #eee; }
    .receipt-fail { padding: 30px 10px; text-align: center; background: #f9f9f9; color: #999; font-size: 11px; }
    .receipt-number { position: absolute; top: 4px; left: 4px; background: #333; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 3px; z-index: 1; }
    .bankbook-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .bankbook-card { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; break-inside: avoid; }
    .bankbook-card img { width: 100%; max-height: 300px; object-fit: contain; background: #f9f9f9; display: block; }
    .bankbook-label { font-size: 10px; color: #666; padding: 4px 8px; background: #f5f5f5; border-top: 1px solid #eee; }
    .small-text { font-size: 9px; color: #888; }
    @media print { body { padding: 10mm; } }
  `
}

interface ReimbursementRow {
  number: number
  date: string
  budgetCode: number
  description: string
  payee: string
  bankName: string
  bankAccount: string
  transportInfo: string
  transportCost: string
  amount: number
  settlementId: string
}

export interface PdfExportOptions {
  includeBankBooks?: boolean
}

/**
 * Export a unified Payment/Reimbursement Request Form PDF:
 * Page 1: Cover — budget code summary + signatures (Multi/See attached for batch)
 * Page 2: Payee summary table (batch only)
 * Page 3+: Per-payee individual forms + their receipts
 * Last (optional): Bank book copies
 */
export async function exportBatchSettlementPdf(
  settlements: Settlement[],
  documentNo = '',
  projectName = '',
  perKmRate = DEFAULT_PER_KM_RATE,
  options: PdfExportOptions = { includeBankBooks: true },
) {
  if (settlements.length === 0) return false

  const isBatch = settlements.length > 1
  const dateStr = formatFirestoreDate(settlements[0].createdAt) || new Date().toLocaleDateString('ko-KR')

  const uniquePayees = [...new Set(settlements.map(s => s.payee))]
  const uniqueCommittees = [...new Set(settlements.map(s => s.committee))]
  const committeeLabel = uniqueCommittees.length === 1 ? t(`committee.${uniqueCommittees[0]}`) : ''

  // Cover page display values
  const payeeDisplay = isBatch ? 'Multi' : uniquePayees[0]
  const bankDisplay = isBatch
    ? t('settlement.seeAttached')
    : `${settlements[0].bankName} ${settlements[0].bankAccount}`

  // Build numbered reimbursement rows
  const rows: ReimbursementRow[] = []
  for (const settlement of settlements) {
    for (const item of settlement.items) {
      const d = item.transportDetail
      let transportInfo = ''
      let transportCost = ''
      if (d) {
        const typeLabel = d.transportType === 'car' ? t('field.transportCar') : t('field.transportPublic')
        const tripLabel = d.tripType === 'round' ? t('field.tripRound') : t('field.tripOneWay')
        transportInfo = `${escapeHtml(d.departure)}→${escapeHtml(d.destination)}<br/>${typeLabel} (${tripLabel})`
        if (d.transportType === 'car' && d.distanceKm) {
          const cost = calcCarTransportAmount(d, perKmRate)
          transportCost = `${d.distanceKm}km × ₩${perKmRate} × ${d.tripType === 'round' ? '2' : '1'}<br/>= ₩${cost.toLocaleString()}`
        }
      }

      rows.push({
        number: rows.length + 1,
        date: settlement.createdAt ? (formatFirestoreDate(settlement.createdAt) || '') : '',
        budgetCode: item.budgetCode,
        description: item.description,
        payee: settlement.payee,
        bankName: settlement.bankName,
        bankAccount: settlement.bankAccount,
        transportInfo,
        transportCost,
        amount: item.amount,
        settlementId: settlement.id,
      })
    }
  }

  // Budget code summary
  const budgetSummary = new Map<number, { code: number; total: number; count: number }>()
  for (const row of rows) {
    const existing = budgetSummary.get(row.budgetCode) || { code: row.budgetCode, total: 0, count: 0 }
    existing.total += row.amount
    existing.count += 1
    budgetSummary.set(row.budgetCode, existing)
  }
  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0)

  // Collect receipts per settlement (for per-payee grouping)
  const receiptsBySettlement = new Map<string, { label: string; receipt: Receipt }[]>()
  for (const settlement of settlements) {
    const firstRow = rows.find(r => r.settlementId === settlement.id)
    const lastRow = [...rows].reverse().find(r => r.settlementId === settlement.id)
    const label = firstRow && lastRow && firstRow.number !== lastRow.number
      ? `#${firstRow.number}-${lastRow.number}`
      : `#${firstRow?.number || '?'}`
    const entries = settlement.receipts.map(receipt => ({
      label: `${label} ${settlement.payee}`,
      receipt,
    }))
    receiptsBySettlement.set(settlement.id, entries)
  }

  // Preload all receipts at once (flat list for efficient batch download)
  const allNumberedReceipts = [...receiptsBySettlement.values()].flat()
  const allImages = await preloadReceipts(allNumberedReceipts.map(nr => nr.receipt))

  // Build index map: settlement id → image indices
  let imageOffset = 0
  const imagesBySettlement = new Map<string, { nr: { label: string; receipt: Receipt }; img: { fileName: string; dataUrl: string | null } }[]>()
  for (const settlement of settlements) {
    const entries = receiptsBySettlement.get(settlement.id) || []
    const mapped = entries.map((nr, i) => ({
      nr,
      img: allImages[imageOffset + i],
    }))
    imagesBySettlement.set(settlement.id, mapped)
    imageOffset += entries.length
  }

  // Bank books (only if option enabled)
  const bankBooks = options.includeBankBooks
    ? [...settlements
        .filter(s => s.bankBookUrl)
        .reduce<Map<string, { payee: string; url: string }>>((map, s) => {
          if (!map.has(s.payee) && s.bankBookUrl) map.set(s.payee, { payee: s.payee, url: s.bankBookUrl })
          return map
        }, new Map())
        .values()]
    : []

  // ── Construct HTML parts ──
  const parts: string[] = []

  // ── Page 1: Cover — Budget Code Summary ──
  parts.push(`
  <h1>${t('settlement.reportTitle')}</h1>
  ${projectName ? `<p class="subtitle" style="font-weight:600;">${escapeHtml(projectName)}</p>` : ''}
  <p class="subtitle">${t('settlement.reportSubtitle')}</p>

  <div class="info-grid">
    <div><span class="label">${t('field.payee')}:</span> ${escapeHtml(payeeDisplay)}${isBatch ? ` (${uniquePayees.length}명)` : ''}</div>
    <div><span class="label">${t('field.bankAndAccount')}:</span> ${escapeHtml(bankDisplay)}</div>
    <div><span class="label">${t('settlement.settlementDate')}:</span> ${escapeHtml(dateStr)}</div>
    ${committeeLabel ? `<div><span class="label">${t('committee.label')}:</span> ${committeeLabel}</div>` : ''}
    <div><span class="label">${t('settlement.requestCount')}:</span> ${settlements.reduce((sum, s) => sum + s.requestIds.length, 0)}</div>
  </div>

  <h2>${t('settlement.budgetSummary')}</h2>
  <table>
    <thead><tr>
      <th>${t('field.budgetCode')}</th>
      <th>${t('field.comments')}</th>
      <th class="text-center">${t('dashboard.count')}</th>
      <th class="text-right">${t('field.totalAmount')}</th>
    </tr></thead>
    <tbody>
      ${UNIQUE_BUDGET_CODES.map(code => {
        const entry = budgetSummary.get(code)
        if (!entry) return ''
        return `<tr>
          <td>${code}</td>
          <td>${t(`budgetCode.${code}`)}</td>
          <td class="text-center">${entry.count}</td>
          <td class="text-right">₩${entry.total.toLocaleString()}</td>
        </tr>`
      }).join('')}
      <tr class="total-row">
        <td colspan="3" class="text-right">${t('field.totalAmount')}</td>
        <td class="text-right">₩${grandTotal.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end;">
    <div style="flex:1;">
      <p style="font-size:10px; color:#666; margin-bottom:4px;">Requested by</p>
      ${!isBatch && settlements[0].requestedBySignature
        ? `<img src="${settlements[0].requestedBySignature}" alt="requester signature" style="max-height:50px;" />`
        : isBatch ? `<p style="font-size:11px; color:#666; font-style:italic;">${t('settlement.seeAttached')}</p>` : ''}
      <div style="border-top:1px solid #ccc; width:200px; margin-top:4px; padding-top:2px; font-size:10px;">${escapeHtml(payeeDisplay)}</div>
    </div>
    <div style="flex:1; text-align:center;">
      <p style="font-size:10px; color:#666; margin-bottom:4px;">Approved by (signature of budget approver)</p>
      ${settlements[0].approvalSignature ? `<img src="${settlements[0].approvalSignature}" alt="signature" style="max-height:50px;" />` : ''}
      <div style="border-top:1px solid #ccc; width:200px; margin:4px auto 0; padding-top:2px; font-size:10px;">${settlements[0].approvedBy ? escapeHtml(settlements[0].approvedBy.name) : '&nbsp;'}</div>
    </div>
  </div>

  <div style="margin-top:30px; border:1px solid #ddd; padding:12px; font-size:11px;">
    <p style="font-weight:600; margin-bottom:8px;">Area Office Finance Verification</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      <div><p style="color:#666; font-size:10px;">Document No.</p><p style="font-weight:600;">${escapeHtml(documentNo) || '-'}</p></div>
      <div><p style="color:#666; font-size:10px;">Signature</p><div style="border-bottom:1px solid #ccc; height:30px;"></div></div>
      <div><p style="color:#666; font-size:10px;">Date approved</p><div style="border-bottom:1px solid #ccc; height:20px;"></div></div>
    </div>
    <div style="margin-top:8px;"><p style="color:#666; font-size:10px;">Additional Information / Comments</p><div style="border-bottom:1px solid #ccc; height:30px;"></div></div>
  </div>
  `)

  // ── Page 2: Payee Summary (batch only) ──
  if (isBatch) {
    parts.push(`
    <div class="page-break">
      <h2>${t('settlement.payeeSummary')}</h2>
      <table>
        <thead><tr>
          <th>#</th>
          <th>${t('field.payee')}</th>
          <th>${t('field.bank')}</th>
          <th>${t('field.bankAccount')}</th>
          <th class="text-right">${t('field.totalAmount')}</th>
        </tr></thead>
        <tbody>
          ${settlements.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(s.payee)}</td>
              <td>${escapeHtml(s.bankName)}</td>
              <td>${escapeHtml(s.bankAccount)}</td>
              <td class="text-right">₩${s.totalAmount.toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right">${t('field.totalAmount')}</td>
            <td class="text-right">₩${grandTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `)
  }

  // ── Page 3+: Per-payee individual forms + receipts ──
  for (const settlement of settlements) {
    const settlementRows = rows.filter(r => r.settlementId === settlement.id)
    const settlementTotal = settlementRows.reduce((sum, r) => sum + r.amount, 0)

    // Individual request form
    parts.push(`
    <div class="page-break">
      <h2>${t('settlement.individualForm')} — ${escapeHtml(settlement.payee)}</h2>
      <div class="info-grid">
        <div><span class="label">${t('field.payee')}:</span> ${escapeHtml(settlement.payee)}</div>
        <div><span class="label">${t('field.phone')}:</span> ${escapeHtml(settlement.phone)}</div>
        <div><span class="label">${t('field.session')}:</span> ${escapeHtml(settlement.session)}</div>
        <div><span class="label">${t('field.bankAndAccount')}:</span> ${escapeHtml(settlement.bankName)} ${escapeHtml(settlement.bankAccount)}</div>
        <div><span class="label">${t('committee.label')}:</span> ${t(`committee.${settlement.committee}`)}</div>
      </div>

      <table>
        <thead><tr>
          <th>#</th>
          <th>${t('field.budgetCode')}</th>
          <th>${t('field.comments')}</th>
          <th>${t('field.transportType')}</th>
          <th>${t('settlement.transportCost')}</th>
          <th class="text-right">${t('field.totalAmount')}</th>
        </tr></thead>
        <tbody>
          ${settlementRows.map((row, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${row.budgetCode}<br/><span class="small-text">${t(`budgetCode.${row.budgetCode}`)}</span></td>
              <td>${escapeHtml(row.description)}</td>
              <td>${row.transportInfo || '-'}</td>
              <td>${row.transportCost || '-'}</td>
              <td class="text-right">₩${row.amount.toLocaleString()}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5" class="text-right">${t('field.totalAmount')}</td>
            <td class="text-right">₩${settlementTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="flex:1;">
          <p style="font-size:10px; color:#666; margin-bottom:4px;">Requested by</p>
          ${settlement.requestedBySignature ? `<img src="${settlement.requestedBySignature}" alt="requester signature" style="max-height:50px;" />` : ''}
          <div style="border-top:1px solid #ccc; width:200px; margin-top:4px; padding-top:2px; font-size:10px;">${escapeHtml(settlement.payee)}</div>
        </div>
        <div style="flex:1; text-align:center;">
          <p style="font-size:10px; color:#666; margin-bottom:4px;">Approved by</p>
          ${settlement.approvalSignature ? `<img src="${settlement.approvalSignature}" alt="signature" style="max-height:50px;" />` : ''}
          <div style="border-top:1px solid #ccc; width:200px; margin:4px auto 0; padding-top:2px; font-size:10px;">${settlement.approvedBy ? escapeHtml(settlement.approvedBy.name) : '&nbsp;'}</div>
        </div>
      </div>
    </div>
    `)

    // This payee's receipts
    const payeeReceiptImages = imagesBySettlement.get(settlement.id) || []
    if (payeeReceiptImages.length > 0) {
      parts.push(`
      <div class="page-break">
        <h2>${t('field.receipts')} — ${escapeHtml(settlement.payee)}</h2>
        <div class="receipt-grid">
          ${payeeReceiptImages.map(({ nr, img }) => {
            if (!img.dataUrl) return `<div class="receipt-card">
              <div class="receipt-number">${escapeHtml(nr.label)}</div>
              <div class="receipt-fail">Failed to load</div>
              <p class="receipt-name">${escapeHtml(img.fileName)}</p>
            </div>`
            return `<div class="receipt-card">
              <div class="receipt-number">${escapeHtml(nr.label)}</div>
              <img src="${escapeHtml(img.dataUrl)}" />
              <p class="receipt-name">${escapeHtml(img.fileName)}</p>
            </div>`
          }).join('')}
        </div>
      </div>
      `)
    }
  }

  // ── Last page: Bank Book Copies (optional) ──
  if (bankBooks.length > 0) {
    parts.push(`
    <div class="page-break">
      <h2>${t('field.bankBook')}</h2>
      <div class="bankbook-grid">
        ${bankBooks.map(bb => `
          <div class="bankbook-card">
            <img src="${escapeHtml(bb.url)}" />
            <p class="bankbook-label">${escapeHtml(bb.payee)}</p>
          </div>
        `).join('')}
      </div>
    </div>
    `)
  }

  const fullHtml = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${t('settlement.reportTitle')} - ${escapeHtml(payeeDisplay)}</title>
  <style>${buildPdfStyles()}</style>
</head><body>
  ${parts.join('')}
</body></html>`

  // Open in new window for printing (pre-existing pattern in this codebase)
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.writeln(fullHtml)
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 1500)
  return true
}

/**
 * Legacy single-settlement export (wraps batch export)
 */
export async function exportSettlementPdf(settlement: Settlement, documentNo = '', projectName = '', perKmRate = DEFAULT_PER_KM_RATE) {
  return exportBatchSettlementPdf([settlement], documentNo, projectName, perKmRate)
}
