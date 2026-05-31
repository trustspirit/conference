import { firestoreToDate } from '../../lib/utils'
import type { Committee, PaymentRequest, RequestStatus } from '../../types'

export interface BudgetCodeItemRow {
  requestId: string
  itemIndex: number
  /**
   * Displayed submission date ('YYYY-MM-DD'). Uses the actual submission
   * timestamp (req.createdAt) when present, falling back to the user-entered
   * req.date for legacy requests that predate createdAt (avoids the 1970 epoch).
   */
  date: string
  submitterName: string
  committee: Committee
  budgetCode: number
  budgetDescKey?: string
  description: string
  /** KRW value after applying usdToKrwRate when item is USD. */
  amountKrw: number
  /** Raw USD amount when item.currency === 'USD'; otherwise 0. */
  amountUsd: number
  status: RequestStatus
}

/** Format a Date as a local-time 'YYYY-MM-DD' string. */
function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Actual submission date when createdAt is a real timestamp; otherwise the
 * user-entered req.date. firestoreToDate returns the epoch (time 0) for a
 * missing/invalid createdAt, which we treat as "no real submission time".
 */
function submissionDate(req: PaymentRequest): string {
  const submittedAt = firestoreToDate(req.createdAt)
  return submittedAt.getTime() === 0 ? (req.date ?? '') : formatYmd(submittedAt)
}

export function flattenRequestsToItems(
  requests: PaymentRequest[],
  usdToKrwRate: number,
  countedStatuses: readonly RequestStatus[]
): BudgetCodeItemRow[] {
  const counted = new Set<RequestStatus>(countedStatuses)
  const rows: BudgetCodeItemRow[] = []
  for (const req of requests) {
    if (!counted.has(req.status)) continue
    const date = submissionDate(req)
    req.items.forEach((item, itemIndex) => {
      const isUsd = item.currency === 'USD'
      const amountUsd = isUsd ? item.amount : 0
      const amountKrw = isUsd ? (usdToKrwRate > 0 ? item.amount * usdToKrwRate : 0) : item.amount
      rows.push({
        requestId: req.id,
        itemIndex,
        date,
        submitterName: req.requestedBy?.name ?? '',
        committee: req.committee,
        budgetCode: item.budgetCode,
        budgetDescKey: item.budgetDescKey,
        description: item.description ?? '',
        amountKrw,
        amountUsd,
        status: req.status,
      })
    })
  }
  return rows
}

export function filterByBudgetCode(
  rows: BudgetCodeItemRow[],
  code: number | 'all'
): BudgetCodeItemRow[] {
  if (code === 'all') return rows
  return rows.filter((r) => r.budgetCode === code)
}

export function searchItems(rows: BudgetCodeItemRow[], query: string): BudgetCodeItemRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) => r.submitterName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  )
}

export type SortKey = 'date' | 'amountKrw' | 'submitterName'
export type SortDirection = 'asc' | 'desc'

export function sortItems(
  rows: BudgetCodeItemRow[],
  key: SortKey,
  direction: SortDirection
): BudgetCodeItemRow[] {
  const mult = direction === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((a, b) => {
    // 'YYYY-MM-DD' strings sort lexicographically in chronological order.
    if (key === 'date') return a.date.localeCompare(b.date) * mult
    if (key === 'amountKrw') return (a.amountKrw - b.amountKrw) * mult
    return a.submitterName.localeCompare(b.submitterName) * mult
  })
  return copy
}
