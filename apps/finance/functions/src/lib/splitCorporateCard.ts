/**
 * 법인카드 분리의 순수 계산부. Firestore 접근이나 인증 로직은 들어가지 않는다.
 * 호출자(functions/src/index.ts)가 문서를 읽어 넘기고, 결과를 배치로 쓴다.
 */

export interface SplitItem {
  amount: number
  currency?: string
  [key: string]: unknown
}

export interface SplitReceipt {
  storagePath: string
  [key: string]: unknown
}

export interface SplitInput {
  items: SplitItem[]
  receipts: SplitReceipt[]
  receiptDisplaySizes?: Record<string, string>
  corporateItemIndexes: number[]
  corporateReceiptPaths: string[]
}

export interface SplitSide {
  items: SplitItem[]
  receipts: SplitReceipt[]
  receiptDisplaySizes?: Record<string, string>
  totalAmount: number
  /** USD 합이 0이면 undefined. 호출자는 이 경우 필드를 쓰지 않거나 삭제한다. */
  totalAmountUsd?: number
}

export interface SplitResult {
  original: SplitSide
  corporate: SplitSide
}

/** 검증 실패. `reason` 은 클라이언트 로케일 키로 매핑되는 안정적인 식별자다. */
export class SplitValidationError extends Error {
  constructor(public readonly reason: string) {
    super(reason)
    this.name = 'SplitValidationError'
  }
}

/** 통화 필드가 없는 레거시 항목은 KRW 로 취급한다. */
function sumByCurrency(items: SplitItem[]): { krw: number; usd: number } {
  let krw = 0
  let usd = 0
  for (const item of items) {
    if (item.currency === 'USD') usd += item.amount
    else krw += item.amount
  }
  return { krw, usd }
}

function pickDisplaySizes(
  all: Record<string, string> | undefined,
  receipts: SplitReceipt[]
): Record<string, string> | undefined {
  if (!all) return undefined
  const picked: Record<string, string> = {}
  for (const r of receipts) {
    if (r.storagePath in all) picked[r.storagePath] = all[r.storagePath]
  }
  return picked
}

function buildSide(
  items: SplitItem[],
  receipts: SplitReceipt[],
  allDisplaySizes: Record<string, string> | undefined
): SplitSide {
  const sums = sumByCurrency(items)
  return {
    items,
    receipts,
    receiptDisplaySizes: pickDisplaySizes(allDisplaySizes, receipts),
    totalAmount: sums.krw,
    totalAmountUsd: sums.usd > 0 ? sums.usd : undefined
  }
}

/** 신청서를 검토하거나 최종승인할 수 있는 역할이면 분리도 할 수 있다. */
export function canSplitRequest(role: string | null | undefined, committee: string): boolean {
  if (!role) return false
  if (role === 'admin' || role === 'super_admin' || role === 'executive') return true
  if (role === 'finance_prep' || role === 'approver_prep') {
    return role === 'finance_prep' || committee === 'preparation'
  }
  if (role === 'finance_ops' || role === 'approver_ops') return committee === 'operations'
  if (role === 'session_director') return committee === 'operations'
  if (role === 'logistic_admin') return committee === 'preparation'
  return false
}

export function splitCorporateCard(input: SplitInput): SplitResult {
  const { items, receipts, receiptDisplaySizes, corporateItemIndexes, corporateReceiptPaths } =
    input

  if (corporateItemIndexes.length === 0) throw new SplitValidationError('EMPTY_SELECTION')

  for (const i of corporateItemIndexes) {
    if (!Number.isInteger(i) || i < 0 || i >= items.length) {
      throw new SplitValidationError('INDEX_OUT_OF_RANGE')
    }
  }

  const selected = new Set(corporateItemIndexes)
  if (selected.size !== corporateItemIndexes.length) {
    throw new SplitValidationError('DUPLICATE_INDEX')
  }
  if (selected.size === items.length) throw new SplitValidationError('FULL_SELECTION')

  const knownPaths = new Set(receipts.map((r) => r.storagePath))
  for (const p of corporateReceiptPaths) {
    if (!knownPaths.has(p)) throw new SplitValidationError('UNKNOWN_RECEIPT_PATH')
  }

  const corporatePaths = new Set(corporateReceiptPaths)
  return {
    original: buildSide(
      items.filter((_, i) => !selected.has(i)),
      receipts.filter((r) => !corporatePaths.has(r.storagePath)),
      receiptDisplaySizes
    ),
    corporate: buildSide(
      items.filter((_, i) => selected.has(i)),
      receipts.filter((r) => corporatePaths.has(r.storagePath)),
      receiptDisplaySizes
    )
  }
}
