import type {
  OpsBudgetCategory,
  OpsBudgetInclusion,
  OpsBudgetInclusionSnapshot,
  PaymentRequest,
  Project,
  RequestStatus,
} from '../../types'

/**
 * Resolve the active USD→KRW rate for a project.
 * Prefers project.usdToKrwRate (new location); falls back to legacy
 * project.opsBudget.usdToKrwRate for backward compat.
 */
export function resolveUsdToKrwRate(project: Project | undefined | null): number {
  return project?.usdToKrwRate ?? project?.opsBudget?.usdToKrwRate ?? 0
}

export interface CategoryTotals {
  includedKrw: number
  includedUsd: number
  remainingKrw: number
  usageRatio: number
}

export interface OpsBudgetTotals {
  byCategory: Record<string, CategoryTotals>
  grandAllocatedKrw: number
  grandTotalKrw: number
  grandTotalUsd: number
  grandRemainingKrw: number
}

const INCLUDABLE_STATUSES: ReadonlySet<RequestStatus> = new Set(['approved', 'settled'])

const PALETTE = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16', '#f97316',
]

export function paletteColor(index: number): string {
  const i = ((index % PALETTE.length) + PALETTE.length) % PALETTE.length
  return PALETTE[i]
}

export function inclusionId(requestId: string, itemIndex: number): string {
  return `${requestId}__${itemIndex}`
}

/**
 * Effective KRW amount for budget calculations.
 * - KRW items: snapshot.amount
 * - USD items: snapshot.amountUsd * usdToKrwRate (0 if rate is 0/undefined)
 */
export function effectiveKrwForSnapshot(
  snapshot: OpsBudgetInclusionSnapshot,
  usdToKrwRate: number,
): number {
  if ((snapshot.currency ?? 'KRW') === 'USD') {
    return Math.round(snapshot.amountUsd * (usdToKrwRate > 0 ? usdToKrwRate : 0))
  }
  return snapshot.amount
}

export function computeCategoryTotals(
  categories: OpsBudgetCategory[],
  inclusions: OpsBudgetInclusion[],
  usdToKrwRate: number = 0,
): OpsBudgetTotals {
  const byCategory: Record<string, CategoryTotals> = {}
  for (const c of categories) {
    byCategory[c.id] = {
      includedKrw: 0, includedUsd: 0,
      remainingKrw: c.allocatedKrw, usageRatio: 0,
    }
  }

  for (const inc of inclusions) {
    const t = byCategory[inc.categoryId]
    if (!t) continue
    const s = inc.snapshot
    const currency = s.currency ?? 'KRW'
    if (currency === 'USD') {
      t.includedUsd += s.amountUsd
      t.includedKrw += effectiveKrwForSnapshot(s, usdToKrwRate)
    } else {
      t.includedKrw += s.amount
    }
  }

  for (const c of categories) {
    const t = byCategory[c.id]
    t.remainingKrw = c.allocatedKrw - t.includedKrw
    t.usageRatio = c.allocatedKrw > 0 ? t.includedKrw / c.allocatedKrw : 0
  }

  const grandAllocatedKrw = categories.reduce((s, c) => s + c.allocatedKrw, 0)
  const grandTotalKrw = Object.values(byCategory).reduce((s, t) => s + t.includedKrw, 0)
  const grandTotalUsd = Object.values(byCategory).reduce((s, t) => s + t.includedUsd, 0)

  return {
    byCategory,
    grandAllocatedKrw,
    grandTotalKrw,
    grandTotalUsd,
    grandRemainingKrw: grandAllocatedKrw - grandTotalKrw,
  }
}

// ---------- Redistribution helpers ----------

export interface RedistributeContext {
  deficit: number
  newSum: number
  totalKrw: number
  availablePool: Array<{ id: string; name: string; allocatedKrw: number }>
}

/**
 * Computes whether adding/editing a category would exceed `totalKrw`, and if so,
 * returns the deficit and the pool of other categories to deduct from.
 *
 * - When `totalKrw` is 0 or not set: no constraint; deficit is always 0.
 * - The draft's id is filtered out from `availablePool`; this correctly handles
 *   both add (fresh UUID never matches) and edit (existing id excluded) cases.
 */
export function computeRedistributeContext(
  currentCategories: OpsBudgetCategory[],
  draftCategory: { id: string; allocatedKrw: number },
  totalKrw: number,
): RedistributeContext {
  const others = currentCategories.filter((c) => c.id !== draftCategory.id)
  const otherSum = others.reduce((s, c) => s + c.allocatedKrw, 0)
  const newSum = otherSum + draftCategory.allocatedKrw
  const deficit = totalKrw > 0 ? newSum - totalKrw : 0
  return {
    deficit,
    newSum,
    totalKrw,
    availablePool: others.map((c) => ({ id: c.id, name: c.name, allocatedKrw: c.allocatedKrw })),
  }
}

/**
 * Computes the deficit and pool when reducing the total budget below the current sum.
 */
export function computeReduceTotalContext(
  currentCategories: OpsBudgetCategory[],
  newTotalKrw: number,
): RedistributeContext {
  const currentSum = currentCategories.reduce((s, c) => s + c.allocatedKrw, 0)
  return {
    deficit: currentSum - newTotalKrw,
    newSum: currentSum,
    totalKrw: newTotalKrw,
    availablePool: currentCategories.map((c) => ({ id: c.id, name: c.name, allocatedKrw: c.allocatedKrw })),
  }
}

export interface IncludableItem {
  requestId: string
  itemIndex: number
  snapshot: OpsBudgetInclusionSnapshot
  source: {
    requestCreatedAt: Date | { toDate: () => Date }
    requestStatus: RequestStatus
  }
}

/** Converts a Date or Firestore Timestamp-like object to milliseconds.
 *  Firestore Timestamp objects are not hydrated to Date by useRequests,
 *  so we must handle both shapes defensively. */
function toMillis(d: unknown): number {
  if (d instanceof Date) return d.getTime()
  const maybe = d as { toDate?: () => Date } | null
  if (maybe && typeof maybe.toDate === 'function') return maybe.toDate().getTime()
  return 0
}

export function diffIncludableItems(
  requests: PaymentRequest[],
  existingInclusions: OpsBudgetInclusion[]
): IncludableItem[] {
  const takenIds = new Set(existingInclusions.map((i) => i.id))
  const out: IncludableItem[] = []
  for (const req of requests) {
    if (req.committee !== 'operations') continue
    if (!INCLUDABLE_STATUSES.has(req.status)) continue
    req.items.forEach((it, itemIndex) => {
      const id = inclusionId(req.id, itemIndex)
      if (takenIds.has(id)) return
      const currency = it.currency ?? 'KRW'
      out.push({
        requestId: req.id,
        itemIndex,
        snapshot: {
          amount: currency === 'USD' ? 0 : it.amount,
          amountUsd: currency === 'USD' ? it.amount : 0,
          currency,
          budgetCode: it.budgetCode,
          budgetDescKey: it.budgetDescKey,
          description: it.description,
          payee: req.payee,
          date: req.date,
          session: req.session,
          requestStatus: req.status,
        },
        source: {
          requestCreatedAt: req.createdAt,
          requestStatus: req.status,
        },
      })
    })
  }
  return out.sort((a, b) => {
    const dt = toMillis(b.source.requestCreatedAt) - toMillis(a.source.requestCreatedAt)
    if (dt !== 0) return dt
    const idCmp = a.requestId.localeCompare(b.requestId)
    if (idCmp !== 0) return idCmp
    return a.itemIndex - b.itemIndex
  })
}
