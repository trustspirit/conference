import type { Committee, PaymentRequest, RequestStatus } from '../../types'

export interface BudgetCodeItemRow {
  requestId: string
  itemIndex: number
  createdAt: Date
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

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  if (value && typeof value === 'object' && 'seconds' in value && typeof (value as { seconds: number }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000)
  }
  return new Date(0)
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
    const createdAt = toDate(req.createdAt)
    req.items.forEach((item, itemIndex) => {
      const isUsd = item.currency === 'USD'
      const amountUsd = isUsd ? item.amount : 0
      const amountKrw = isUsd ? (usdToKrwRate > 0 ? item.amount * usdToKrwRate : 0) : item.amount
      rows.push({
        requestId: req.id,
        itemIndex,
        createdAt,
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

export type SortKey = 'createdAt' | 'amountKrw' | 'submitterName'
export type SortDirection = 'asc' | 'desc'

export function sortItems(
  rows: BudgetCodeItemRow[],
  key: SortKey,
  direction: SortDirection
): BudgetCodeItemRow[] {
  const mult = direction === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((a, b) => {
    if (key === 'createdAt') return (a.createdAt.getTime() - b.createdAt.getTime()) * mult
    if (key === 'amountKrw') return (a.amountKrw - b.amountKrw) * mult
    return a.submitterName.localeCompare(b.submitterName) * mult
  })
  return copy
}
