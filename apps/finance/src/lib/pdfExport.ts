import { httpsCallable } from 'firebase/functions'
import * as pdfjsLib from 'pdfjs-dist'
import { Settlement, PaymentRequest, Receipt, AppUser, Currency } from '../types'
import { functions } from '@conference/firebase'
import i18n from './i18n'
import { formatFirestoreDate } from './utils'
import { UNIQUE_BUDGET_CODES } from '../constants/budgetCodes'
import { calcCarTransportAmount, DEFAULT_PER_KM_RATE } from '../components/ItemRow'
import { formatAmount, formatTotals, getItemCurrency } from './currency'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts)
const tEn = i18n.getFixedT('en')

/** Korean label + English in grayscale (for PDF headers / bilingual cells) */
function bilingual(key: string) {
  const ko = t(key)
  const en = tEn(key)
  if (!en || ko === en) return ko
  return `${ko} <span style="color:#999; font-weight:400;">${en}</span>`
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Render EVERY page of a PDF to a PNG data URL. A multi-page receipt (e.g. a
 *  scanned invoice + terms) must attach all pages, not just the cover — rendering
 *  only page 1 silently drops the rest. Returns one data URL per page, in order;
 *  an empty array signals a failed/empty document so callers can show a fallback. */
async function pdfToImageDataUrls(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data })
    const pdf = await loadingTask.promise
    const urls: string[] = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const scale = 2
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        canvas.width = 0
        canvas.height = 0
        continue
      }
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      urls.push(canvas.toDataURL('image/png'))
      canvas.width = 0
      canvas.height = 0
    }
    return urls
  } catch (err) {
    console.error('pdfToImageDataUrls failed:', err)
    return []
  }
}

/** Fetch a URL and convert to data URLs (handles both images and PDFs). Returns
 *  one data URL per page for PDFs (all pages), a single-element array for images,
 *  and an empty array on failure. */
async function preloadImageUrl(url: string): Promise<string[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const blob = await res.blob()
    const isPdf =
      blob.type === 'application/pdf' || decodeURIComponent(url).toLowerCase().includes('.pdf')
    if (isPdf) {
      const arrayBuffer = await blob.arrayBuffer()
      return await pdfToImageDataUrls(arrayBuffer)
    }
    return await new Promise<string[]>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve([reader.result as string])
      reader.onerror = () => resolve([])
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('preloadImageUrl failed:', err)
    return []
  }
}

type ReceiptDownloadFn = ReturnType<
  typeof httpsCallable<
    { storagePath: string },
    { data: string; contentType: string; fileName: string }
  >
>

// Receipts are fetched through the `downloadFileV2` callable, which loads each
// file into memory and returns it base64-encoded. Firing one request per receipt
// all at once (Promise.all over every receipt) overwhelms the function instance
// once there are many receipts — concurrent in-memory downloads exhaust memory /
// hit timeouts, so some requests fail and render as "Failed to load". Bound the
// concurrency and retry transient failures so large settlements load reliably.
const RECEIPT_DOWNLOAD_CONCURRENCY = 6
const RECEIPT_DOWNLOAD_RETRIES = 2

// Callable error codes that are deterministic — retrying cannot help, so fail fast
// instead of burning the full retry budget (and extra function calls) on them.
const NON_RETRYABLE_CODES = new Set([
  'functions/invalid-argument',
  'functions/permission-denied',
  'functions/not-found',
  'functions/unauthenticated'
])

// One receipt can expand into multiple images: a PDF renders one image per page,
// while an image file (or a failure) yields a single entry. `dataUrls` always has
// length ≥ 1 — a `[null]` entry represents a receipt that failed to load so the
// print output still shows a "Failed to load" placeholder card.
type PreloadedReceipt = { fileName: string; dataUrls: (string | null)[] }

async function downloadOneReceipt(
  downloadFn: ReceiptDownloadFn,
  r: Receipt
): Promise<PreloadedReceipt> {
  if (!r.storagePath) return { fileName: r.fileName, dataUrls: [null] }

  for (let attempt = 0; attempt <= RECEIPT_DOWNLOAD_RETRIES; attempt++) {
    try {
      const result = await downloadFn({ storagePath: r.storagePath })
      const { data, contentType } = result.data
      const isPdf = r.fileName.toLowerCase().endsWith('.pdf') || contentType === 'application/pdf'

      if (isPdf) {
        const binary = atob(data)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const pageDataUrls = await pdfToImageDataUrls(bytes)
        return {
          fileName: r.fileName,
          dataUrls: pageDataUrls.length > 0 ? pageDataUrls : [null]
        }
      }

      return { fileName: r.fileName, dataUrls: [`data:${contentType};base64,${data}`] }
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
      const deterministic = NON_RETRYABLE_CODES.has(code)
      if (deterministic || attempt === RECEIPT_DOWNLOAD_RETRIES) {
        console.error(
          `Failed to preload receipt "${r.fileName}"${
            deterministic ? '' : ` after ${attempt + 1} attempts`
          }:`,
          err
        )
        return { fileName: r.fileName, dataUrls: [null] }
      }
      // Exponential backoff (300ms, 600ms) lets a momentarily overloaded
      // function recover before we retry.
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt))
    }
  }
  return { fileName: r.fileName, dataUrls: [null] }
}

async function preloadReceipts(receipts: Receipt[]) {
  const downloadFn = httpsCallable<
    { storagePath: string },
    { data: string; contentType: string; fileName: string }
  >(functions, 'downloadFileV2')

  const results: PreloadedReceipt[] = new Array(receipts.length)
  let next = 0
  const worker = async () => {
    while (true) {
      const i = next++
      if (i >= receipts.length) return
      results[i] = await downloadOneReceipt(downloadFn, receipts[i])
    }
  }

  const poolSize = Math.min(RECEIPT_DOWNLOAD_CONCURRENCY, receipts.length)
  await Promise.all(Array.from({ length: poolSize }, () => worker()))
  return results
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
    /* "Large" receipt — reserved for dense documents (business registrations, contracts).
       Spans a full A4 page so all text stays legible. Page breaks are handled by the
       wrapper (.large-page) so we do not double up page-break-before + page-break-after. */
    .receipt-card-large { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; break-inside: avoid; position: relative; }
    .receipt-card-large img { width: 100%; max-height: 240mm; object-fit: contain; background: #f9f9f9; display: block; }
    .large-page { page-break-before: always; }
    .bankbook-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .bankbook-card { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; break-inside: avoid; }
    .bankbook-card img { width: 100%; max-height: 300px; object-fit: contain; background: #f9f9f9; display: block; }
    .bankbook-label { font-size: 10px; color: #666; padding: 4px 8px; background: #f5f5f5; border-top: 1px solid #eee; }
    .small-text { font-size: 9px; color: #888; }
    @media print { body { padding: 10mm; } }
  `
}

type NumberedReceiptImage = {
  nr: { label: string; receipt: Receipt; displaySize?: 'large' }
  img: { fileName: string; dataUrl: string | null }
}

function splitBySize(items: NumberedReceiptImage[]) {
  const large: NumberedReceiptImage[] = []
  const normal: NumberedReceiptImage[] = []
  for (const item of items) {
    if (item.nr.displaySize === 'large') large.push(item)
    else normal.push(item)
  }
  return { large, normal }
}

function renderReceiptCards(items: NumberedReceiptImage[], size: 'normal' | 'large'): string {
  const cls = size === 'large' ? 'receipt-card-large' : 'receipt-card'
  return items
    .map(({ nr, img }) => {
      const inner = !img.dataUrl
        ? `<div class="${cls}">
            <div class="receipt-number">${escapeHtml(nr.label)}</div>
            <div class="receipt-fail">Failed to load</div>
            <p class="receipt-name">${escapeHtml(img.fileName)}</p>
          </div>`
        : `<div class="${cls}">
            <div class="receipt-number">${escapeHtml(nr.label)}</div>
            <img src="${escapeHtml(img.dataUrl)}" />
            <p class="receipt-name">${escapeHtml(img.fileName)}</p>
          </div>`
      // Each large card gets its own page; normals flow into the parent grid.
      return size === 'large' ? `<div class="large-page">${inner}</div>` : inner
    })
    .join('')
}

/**
 * Expand a form's receipt entries into per-page numbered images. Each receipt may
 * have produced multiple page images (multi-page PDF) or a single one (image / single
 * page / failure). The receipt number badge (`nr.label`) is preserved across all pages
 * of the same receipt; when a receipt spans multiple pages, its filename gets a
 * `(page/total)` suffix so reviewers can tell the pages apart.
 *
 * `entries` and `images` are index-aligned (both derived from the same receipt list).
 */
export function expandReceiptImages(
  entries: { label: string; receipt: Receipt; displaySize?: 'large' }[],
  images: { fileName: string; dataUrls: (string | null)[] }[]
): NumberedReceiptImage[] {
  const out: NumberedReceiptImage[] = []
  entries.forEach((nr, i) => {
    const img = images[i]
    const pages = img && img.dataUrls.length > 0 ? img.dataUrls : [null]
    const fileName = img?.fileName ?? nr.receipt.fileName
    const multiPage = pages.length > 1
    pages.forEach((pageUrl, pageIdx) => {
      out.push({
        nr,
        img: {
          fileName: multiPage ? `${fileName} (${pageIdx + 1}/${pages.length})` : fileName,
          dataUrl: pageUrl
        }
      })
    })
  })
  return out
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
  currency: Currency
  settlementId: string
}

export interface PdfExportOptions {
  includeBankBooks?: boolean
  originalRequests?: PaymentRequest[]
  payeeUsers?: Map<string, AppUser>
  reportTitle?: string
  createdBySignature?: string | null
  createdByName?: string
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
  options: PdfExportOptions = { includeBankBooks: true }
) {
  if (settlements.length === 0) return false

  const reportTitle = options.reportTitle || t('settlement.reportTitle')
  const reportSubtitle = options.reportTitle ? options.reportTitle : t('settlement.reportSubtitle')

  const isCorporateCard = settlements.some((s) => s.isCorporateCard)
  const isBatch = settlements.length > 1
  const dateStr =
    formatFirestoreDate(settlements[0].createdAt) || new Date().toLocaleDateString('ko-KR')

  const originalRequests = options.originalRequests || []
  const uniquePayees = [...new Set(settlements.map((s) => s.payee))]
  // Use approvers array if available, fall back to originalRequests, then single approvedBy
  const uniqueApprovers = settlements.some((s) => s.approvers?.length)
    ? [...new Set(settlements.flatMap((s) => s.approvers?.map((a) => a.uid) || []))]
    : originalRequests.length > 0
      ? [...new Set(originalRequests.map((r) => r.approvedBy?.uid).filter(Boolean))]
      : [...new Set(settlements.map((s) => s.approvedBy?.uid).filter(Boolean))]
  const uniqueCommittees = [...new Set(settlements.map((s) => s.committee))]
  const committeeLabel = uniqueCommittees.map((c) => t(`committee.${c}`)).join(' / ')

  // Determine if individual form pages are needed
  // Not needed when all requests share the same payee, bank, and approver
  const needsIndividualForms = uniquePayees.length > 1 || uniqueApprovers.length > 1

  // Cover page display values
  const payeeDisplay = needsIndividualForms ? 'Multi' : uniquePayees[0]
  const bankDisplay = needsIndividualForms
    ? t('settlement.seeBelow')
    : `${settlements[0].bankName} ${settlements[0].bankAccount}`

  // Build numbered reimbursement rows
  const rows: ReimbursementRow[] = []
  for (const settlement of settlements) {
    for (const item of settlement.items) {
      const d = item.transportDetail
      let transportInfo = ''
      let transportCost = ''
      if (d) {
        const typeLabel =
          d.transportType === 'car' ? t('field.transportCar') : t('field.transportPublic')
        const tripLabel = d.tripType === 'round' ? t('field.tripRound') : t('field.tripOneWay')
        transportInfo = `${escapeHtml(d.departure)}→${escapeHtml(d.destination)}<br/>${typeLabel} (${tripLabel})`
        if (d.transportType === 'car' && d.distanceKm) {
          const cost = calcCarTransportAmount(d, perKmRate)
          transportCost = `${d.distanceKm}km × ${formatAmount(perKmRate, 'KRW')} × ${d.tripType === 'round' ? '2' : '1'}<br/>= ${formatAmount(cost, 'KRW')}`
          if (d.routeMapImage?.url) {
            transportCost += `<br/><img src="${escapeHtml(d.routeMapImage.url)}" style="max-width:200px; max-height:120px; margin-top:4px; border:1px solid #ddd; border-radius:3px;" onerror="this.style.display='none'" />`
          }
        }
      }

      rows.push({
        number: rows.length + 1,
        date: settlement.createdAt ? formatFirestoreDate(settlement.createdAt) || '' : '',
        budgetCode: item.budgetCode,
        description: item.description,
        payee: settlement.payee,
        bankName: settlement.bankName || '',
        bankAccount: settlement.bankAccount || '',
        transportInfo,
        transportCost,
        amount: item.amount,
        currency: getItemCurrency(item),
        settlementId: settlement.id
      })
    }
  }

  // Budget code summary — track KRW/USD separately
  const budgetSummary = new Map<
    number,
    { code: number; totalKrw: number; totalUsd: number; count: number }
  >()
  for (const row of rows) {
    const existing = budgetSummary.get(row.budgetCode) || {
      code: row.budgetCode,
      totalKrw: 0,
      totalUsd: 0,
      count: 0
    }
    if (row.currency === 'USD') existing.totalUsd += row.amount
    else existing.totalKrw += row.amount
    existing.count += 1
    budgetSummary.set(row.budgetCode, existing)
  }
  const grandTotalKrw = rows.filter((r) => r.currency === 'KRW').reduce((s, r) => s + r.amount, 0)
  const grandTotalUsd = rows.filter((r) => r.currency === 'USD').reduce((s, r) => s + r.amount, 0)

  // Determine individual form sources: original requests if available, otherwise settlements
  const useOriginalRequests = originalRequests.length > 0
  const formSources = useOriginalRequests ? originalRequests : settlements

  // Collect receipts per form source (original request or settlement). The
  // displaySize hint comes from the source's `receiptDisplaySizes` map keyed by
  // storagePath — staff-managed override, defaults to undefined (normal).
  const receiptsByForm = new Map<
    string,
    { label: string; receipt: Receipt; displaySize?: 'large' }[]
  >()
  for (let idx = 0; idx < formSources.length; idx++) {
    const source = formSources[idx]
    const sizeMap = source.receiptDisplaySizes ?? {}
    const entries = source.receipts.map((receipt) => ({
      label: `#${idx + 1} ${source.payee}`,
      receipt,
      displaySize: sizeMap[receipt.storagePath]
    }))
    receiptsByForm.set(source.id, entries)
  }

  // Preload all receipts at once (flat list for efficient batch download)
  const allNumberedReceipts = [...receiptsByForm.values()].flat()
  const allImages = await preloadReceipts(allNumberedReceipts.map((nr) => nr.receipt))

  // Build index map: form source id → per-page numbered images. Each entry can
  // expand into several images when its receipt is a multi-page PDF.
  let imageOffset = 0
  const imagesByForm = new Map<string, NumberedReceiptImage[]>()
  for (const source of formSources) {
    const entries = receiptsByForm.get(source.id) || []
    const formImages = allImages.slice(imageOffset, imageOffset + entries.length)
    imagesByForm.set(source.id, expandReceiptImages(entries, formImages))
    imageOffset += entries.length
  }

  // Bank books (only if option enabled, skip for corporate card)
  // Vendor requests use the vendor bank book from the request; regular requests prefer user profile URL
  const payeeUsers = options.payeeUsers
  const bankBooks: { payee: string; dataUrl: string }[] = []
  if (options.includeBankBooks && !isCorporateCard) {
    const seenPayees = new Set<string>()
    const bankBookEntries: { payee: string; url: string }[] = []
    for (const s of settlements) {
      const req = originalRequests.find((r) => s.requestIds.includes(r.id))
      const payeeKey = `${s.payee}-${s.bankAccount}`
      if (seenPayees.has(payeeKey)) continue
      seenPayees.add(payeeKey)
      let url: string | undefined
      if (req?.isVendorRequest) {
        url = req.vendorBankBookUrl || s.bankBookUrl
      } else {
        // 정산 시점 스냅샷 우선, 없으면 사용자 프로필 fallback
        const uid = req?.requestedBy.uid
        const userBankBook =
          uid && payeeUsers
            ? payeeUsers.get(uid)?.bankBookUrl || payeeUsers.get(uid)?.bankBookDriveUrl
            : undefined
        url = s.bankBookUrl || userBankBook
      }
      if (url) bankBookEntries.push({ payee: s.payee, url })
    }
    // Preload bank book images as data URLs to avoid CORS/auth issues in print window.
    // A PDF bank book renders one image per page, so each URL can expand into several.
    const preloaded = await Promise.all(bankBookEntries.map((bb) => preloadImageUrl(bb.url)))
    for (let i = 0; i < bankBookEntries.length; i++) {
      for (const dataUrl of preloaded[i]) {
        bankBooks.push({ payee: bankBookEntries[i].payee, dataUrl })
      }
    }
  }

  // ── Construct HTML parts ──
  const parts: string[] = []

  // ── Page 1: Cover — Budget Code Summary ──
  parts.push(`
  <h1>${escapeHtml(reportTitle)}</h1>
  ${projectName ? `<p class="subtitle" style="font-weight:600;">${escapeHtml(projectName)}</p>` : ''}
  <p class="subtitle">${escapeHtml(reportSubtitle)}</p>

  <div class="info-grid">
    <div><span class="label">${t('field.payee')}:</span> ${escapeHtml(payeeDisplay)}${isBatch ? ` (${t('settlement.payeeCount', { count: uniquePayees.length })})` : ''}</div>
    ${!isCorporateCard ? `<div><span class="label">${t('field.bankAndAccount')}:</span> ${escapeHtml(bankDisplay)}</div>` : ''}
    <div><span class="label">${t('settlement.settlementDate')}:</span> ${escapeHtml(dateStr)}</div>
    ${committeeLabel ? `<div><span class="label">${t('committee.label')}:</span> ${committeeLabel}</div>` : ''}
    <div><span class="label">${t('settlement.requestCount')}:</span> ${new Set(settlements.flatMap((s) => s.requestIds)).size}</div>
  </div>

  <h2>${t('settlement.budgetSummary')}</h2>
  <table>
    <thead><tr>
      <th>${bilingual('field.budgetCode')}</th>
      <th>${bilingual('field.comments')}</th>
      <th class="text-right">${bilingual('field.totalAmount')}</th>
    </tr></thead>
    <tbody>
      ${UNIQUE_BUDGET_CODES.map((code) => {
        const entry = budgetSummary.get(code)
        if (!entry) return ''
        return `<tr>
          <td>${code}</td>
          <td>${t(`budgetCode.${code}`)} <span style="color:#999;">${tEn(`budgetCode.${code}`)}</span></td>
          <td class="text-right">${formatTotals(entry.totalKrw, entry.totalUsd)}</td>
        </tr>`
      }).join('')}
      <tr class="total-row">
        <td colspan="2" class="text-right">${t('field.totalAmount')}</td>
        <td class="text-right">${formatTotals(grandTotalKrw, grandTotalUsd)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end;">
    <div style="flex:1;">
      <p style="font-size:10px; color:#666; margin-bottom:4px;">Requested by</p>
      ${options.createdBySignature ? `<img src="${options.createdBySignature}" alt="creator signature" style="max-height:50px;" />` : ''}
      <div style="border-top:1px solid #ccc; width:200px; margin-top:4px; padding-top:2px; font-size:10px;">${options.createdByName ? escapeHtml(options.createdByName) : '&nbsp;'}</div>
    </div>
    <div style="flex:1; text-align:center;">
      <p style="font-size:10px; color:#666; margin-bottom:4px;">Approved by (signature of budget approver)</p>
      ${
        needsIndividualForms
          ? `<p style="font-size:11px; color:#666; font-style:italic;">${t('settlement.seeBelow')}</p>`
          : settlements[0].approvalSignature
            ? `<img src="${settlements[0].approvalSignature}" alt="signature" style="max-height:50px;" />`
            : ''
      }
      <div style="border-top:1px solid #ccc; width:200px; margin:4px auto 0; padding-top:2px; font-size:10px;">${needsIndividualForms ? 'Multi' : settlements[0].approvedBy ? escapeHtml(settlements[0].approvedBy.name) : '&nbsp;'}</div>
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

  // ── Page 2: Payee Summary (only when multiple payees) ──
  if (uniquePayees.length > 1) {
    parts.push(`
    <div class="page-break">
      <h2>${t('settlement.payeeSummary')}</h2>
      <table>
        <thead><tr>
          <th>#</th>
          <th>${bilingual('field.payee')}</th>
          ${!isCorporateCard ? `<th>${bilingual('field.bank')}</th>
          <th>${bilingual('field.bankAccount')}</th>` : ''}
          <th class="text-right">${bilingual('field.totalAmount')}</th>
        </tr></thead>
        <tbody>
          ${settlements
            .map(
              (s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(s.payee)}</td>
              ${!isCorporateCard ? `<td>${escapeHtml(s.bankName || '')}</td>
              <td>${escapeHtml(s.bankAccount || '')}</td>` : ''}
              <td class="text-right">${formatTotals(s.totalAmount, s.totalAmountUsd || 0)}</td>
            </tr>
          `
            )
            .join('')}
          <tr class="total-row">
            <td colspan="${isCorporateCard ? 2 : 4}" class="text-right">${t('field.totalAmount')}</td>
            <td class="text-right">${formatTotals(grandTotalKrw, grandTotalUsd)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `)
  }

  if (needsIndividualForms) {
    // ── Page 3+: Individual forms + receipts (per original request or per settlement) ──
    for (let formIdx = 0; formIdx < formSources.length; formIdx++) {
      const source = formSources[formIdx]
      // Build item rows for this form source
      const formItems: ReimbursementRow[] = []
      for (const item of source.items) {
        const d = item.transportDetail
        let ti = ''
        let tc = ''
        if (d) {
          const typeLabel =
            d.transportType === 'car' ? t('field.transportCar') : t('field.transportPublic')
          const tripLabel = d.tripType === 'round' ? t('field.tripRound') : t('field.tripOneWay')
          ti = `${escapeHtml(d.departure)}→${escapeHtml(d.destination)}<br/>${typeLabel} (${tripLabel})`
          if (d.transportType === 'car' && d.distanceKm) {
            const cost = calcCarTransportAmount(d, perKmRate)
            tc = `${d.distanceKm}km × ${formatAmount(perKmRate, 'KRW')} × ${d.tripType === 'round' ? '2' : '1'}<br/>= ${formatAmount(cost, 'KRW')}`
            if (d.routeMapImage?.url) {
              tc += `<br/><img src="${escapeHtml(d.routeMapImage.url)}" style="max-width:200px; max-height:120px; margin-top:4px; border:1px solid #ddd; border-radius:3px;" onerror="this.style.display='none'" />`
            }
          }
        }
        formItems.push({
          number: formItems.length + 1,
          date: '',
          budgetCode: item.budgetCode,
          description: item.description,
          payee: source.payee,
          bankName: source.bankName || '',
          bankAccount: source.bankAccount || '',
          transportInfo: ti,
          transportCost: tc,
          amount: item.amount,
          currency: getItemCurrency(item),
          settlementId: source.id
        })
      }
      const formTotalKrw = formItems
        .filter((r) => r.currency === 'KRW')
        .reduce((s, r) => s + r.amount, 0)
      const formTotalUsd = formItems
        .filter((r) => r.currency === 'USD')
        .reduce((s, r) => s + r.amount, 0)

      // Determine signature sources
      const isRequest =
        'approvalSignature' in source && 'requestedBy' in source && 'status' in source
      const reqSource = isRequest ? (source as PaymentRequest) : null
      const setSource = !isRequest ? (source as Settlement) : null
      const parentSettlement = reqSource
        ? settlements.find((s) => s.requestIds.includes(reqSource.id))
        : null
      const requesterSig = reqSource
        ? parentSettlement?.requestedBySignature || null
        : setSource?.requestedBySignature || null
      const approverSig = reqSource
        ? reqSource.approvalSignature
        : setSource?.approvalSignature || null
      const approverName = reqSource ? reqSource.approvedBy?.name : setSource?.approvedBy?.name

      // Individual form
      parts.push(`
      <div class="page-break">
        <h2>${t('settlement.individualForm')} #${formIdx + 1} — ${escapeHtml(source.payee)}</h2>
        <div class="info-grid">
          <div><span class="label">${t('field.payee')}:</span> ${escapeHtml(source.payee)}</div>
          <div><span class="label">${t('field.phone')}:</span> ${escapeHtml(source.phone)}</div>
          <div><span class="label">${t('field.session')}:</span> ${escapeHtml(source.session)}</div>
          ${!isCorporateCard ? `<div><span class="label">${t('field.bankAndAccount')}:</span> ${escapeHtml(source.bankName || '')} ${escapeHtml(source.bankAccount || '')}</div>` : ''}
          <div><span class="label">${t('committee.label')}:</span> ${t(`committee.${source.committee}`)}</div>
        </div>

        <table>
          <thead><tr>
            <th>#</th>
            <th>${bilingual('field.budgetCode')}</th>
            <th>${bilingual('field.comments')}</th>
            <th>${bilingual('field.transportType')}</th>
            <th>${bilingual('settlement.transportCost')}</th>
            <th class="text-right">${bilingual('field.totalAmount')}</th>
          </tr></thead>
          <tbody>
            ${formItems
              .map(
                (row, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${row.budgetCode}<br/><span class="small-text">${t(`budgetCode.${row.budgetCode}`)}</span></td>
                <td>${escapeHtml(row.description)}</td>
                <td>${row.transportInfo || '-'}</td>
                <td>${row.transportCost || '-'}</td>
                <td class="text-right">${formatAmount(row.amount, row.currency)}</td>
              </tr>
            `
              )
              .join('')}
            <tr class="total-row">
              <td colspan="5" class="text-right">${t('field.totalAmount')}</td>
              <td class="text-right">${formatTotals(formTotalKrw, formTotalUsd)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end;">
          <div style="flex:1;">
            <p style="font-size:10px; color:#666; margin-bottom:4px;">Requested by</p>
            ${requesterSig ? `<img src="${requesterSig}" alt="requester signature" style="max-height:50px;" />` : ''}
            <div style="border-top:1px solid #ccc; width:200px; margin-top:4px; padding-top:2px; font-size:10px;">${escapeHtml(source.payee)}</div>
          </div>
          <div style="flex:1; text-align:center;">
            <p style="font-size:10px; color:#666; margin-bottom:4px;">Approved by</p>
            ${approverSig ? `<img src="${approverSig}" alt="signature" style="max-height:50px;" />` : ''}
            <div style="border-top:1px solid #ccc; width:200px; margin:4px auto 0; padding-top:2px; font-size:10px;">${approverName ? escapeHtml(approverName) : '&nbsp;'}</div>
          </div>
        </div>
      </div>
      `)

      // This form's receipts — large ones get their own page, normals fill a grid.
      const formReceiptImages = imagesByForm.get(source.id) || []
      if (formReceiptImages.length > 0) {
        const { large, normal } = splitBySize(formReceiptImages)
        const header = `<h2>${t('field.receipts')} — ${escapeHtml(source.payee)}</h2>`
        if (normal.length > 0) {
          parts.push(`
          <div class="page-break">
            ${header}
            <div class="receipt-grid">${renderReceiptCards(normal, 'normal')}</div>
          </div>
          `)
        }
        // Each large card is its own .large-page (page-break-before: always).
        // No outer .page-break wrapper — that would insert an extra blank page.
        if (large.length > 0) parts.push(renderReceiptCards(large, 'large'))
      }
    }
  } else {
    // ── Unified: all receipts together (no individual forms needed) ──
    const allReceiptImages = [...imagesByForm.values()].flat()
    if (allReceiptImages.length > 0) {
      const { large, normal } = splitBySize(allReceiptImages)
      const header = `<h2>${t('field.receipts')}</h2>`
      if (normal.length > 0) {
        parts.push(`
        <div class="page-break">
          ${header}
          <div class="receipt-grid">${renderReceiptCards(normal, 'normal')}</div>
        </div>
        `)
      }
      if (large.length > 0) parts.push(renderReceiptCards(large, 'large'))
    }
  }

  // ── Last page: Bank Book Copies (optional) ──
  if (bankBooks.length > 0) {
    parts.push(`
    <div class="page-break">
      <h2>${t('field.bankBook')}</h2>
      <div class="bankbook-grid">
        ${bankBooks
          .map(
            (bb) => `
          <div class="bankbook-card">
            <img src="${escapeHtml(bb.dataUrl)}" />
            <p class="bankbook-label">${escapeHtml(bb.payee)}</p>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `)
  }

  const fullHtml = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${escapeHtml(reportTitle)} - ${escapeHtml(payeeDisplay)}</title>
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
export async function exportSettlementPdf(
  settlement: Settlement,
  documentNo = '',
  projectName = '',
  perKmRate = DEFAULT_PER_KM_RATE
) {
  return exportBatchSettlementPdf([settlement], documentNo, projectName, perKmRate)
}
