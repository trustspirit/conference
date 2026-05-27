import { describe, it, expect } from 'vitest'
import {
  inclusionId,
  computeCategoryTotals,
  diffIncludableItems,
  paletteColor,
  computeRedistributeContext,
  computeReduceTotalContext,
  type CategoryTotals,
} from './opsBudgetSelectors'
import type {
  OpsBudgetCategory, OpsBudgetInclusion, PaymentRequest
} from '../../types'

const baseInclusion = (
  overrides: Partial<OpsBudgetInclusion> = {}
): OpsBudgetInclusion => ({
  id: 'r1__0',
  categoryId: 'c1',
  requestId: 'r1',
  itemIndex: 0,
  snapshot: {
    amount: 100000, amountUsd: 0, currency: 'KRW',
    budgetCode: 5862, description: 'x', payee: 'p',
    date: '2026-05-01', session: 'S1', requestStatus: 'approved',
  },
  addedBy: { uid: 'u1', name: 'n', email: 'e' },
  addedAt: new Date('2026-05-10'),
  ...overrides,
})

describe('inclusionId', () => {
  it('joins requestId and itemIndex with double underscore', () => {
    expect(inclusionId('reqABC', 3)).toBe('reqABC__3')
  })
})

describe('computeCategoryTotals', () => {
  it('sums KRW and USD separately per category', () => {
    const cats: OpsBudgetCategory[] = [
      { id: 'c1', name: 'A', budgetCode: 5862, allocatedKrw: 500000, sortIndex: 0 },
      { id: 'c2', name: 'B', budgetCode: 5110, allocatedKrw: 200000, sortIndex: 1 },
    ]
    const incs: OpsBudgetInclusion[] = [
      baseInclusion({ id: 'r1__0', categoryId: 'c1', snapshot: { ...baseInclusion().snapshot, amount: 100000 } }),
      baseInclusion({ id: 'r1__1', categoryId: 'c1', snapshot: { ...baseInclusion().snapshot, amount: 50000 } }),
      baseInclusion({
        id: 'r2__0', categoryId: 'c2',
        snapshot: { ...baseInclusion().snapshot, amount: 0, amountUsd: 30, currency: 'USD' }
      }),
    ]
    const totals = computeCategoryTotals(cats, incs)
    expect(totals.byCategory.c1).toEqual<CategoryTotals>({
      includedKrw: 150000, includedUsd: 0, remainingKrw: 350000, usageRatio: 150000 / 500000,
    })
    expect(totals.byCategory.c2).toEqual<CategoryTotals>({
      includedKrw: 0, includedUsd: 30, remainingKrw: 200000, usageRatio: 0,
    })
    expect(totals.grandTotalKrw).toBe(150000)
    expect(totals.grandTotalUsd).toBe(30)
    expect(totals.grandAllocatedKrw).toBe(700000)
    expect(totals.grandRemainingKrw).toBe(550000)
  })

  it('treats missing currency as KRW (legacy)', () => {
    const cats: OpsBudgetCategory[] = [
      { id: 'c1', name: 'A', budgetCode: 5862, allocatedKrw: 100000, sortIndex: 0 },
    ]
    const inc = baseInclusion()
    // Remove currency entirely (legacy data shape)
    const { currency: _drop, ...snapshotNoCurrency } = inc.snapshot
    const incs: OpsBudgetInclusion[] = [
      { ...inc, snapshot: { ...snapshotNoCurrency, amount: 40000 } as OpsBudgetInclusion['snapshot'] },
    ]
    expect(computeCategoryTotals(cats, incs).byCategory.c1.includedKrw).toBe(40000)
  })

  it('marks overflow when included exceeds allocation', () => {
    const cats: OpsBudgetCategory[] = [
      { id: 'c1', name: 'A', budgetCode: 5862, allocatedKrw: 100000, sortIndex: 0 },
    ]
    const incs: OpsBudgetInclusion[] = [
      baseInclusion({ snapshot: { ...baseInclusion().snapshot, amount: 150000 } }),
    ]
    const t = computeCategoryTotals(cats, incs).byCategory.c1
    expect(t.remainingKrw).toBe(-50000)
    expect(t.usageRatio).toBe(1.5)
  })

  it('returns empty totals for project with no categories', () => {
    expect(computeCategoryTotals([], []).grandAllocatedKrw).toBe(0)
  })
})

describe('diffIncludableItems', () => {
  const mkReq = (
    id: string, status: 'approved' | 'settled' | 'pending',
    committee: 'operations' | 'preparation',
    items: { amount: number; budgetCode: number; currency?: 'KRW' | 'USD'; description: string }[]
  ): PaymentRequest => ({
    id, projectId: 'p1', createdAt: new Date(),
    status, payee: 'P', phone: '', bankName: '', bankAccount: '',
    date: '2026-05-01', session: 'S1', committee,
    items: items.map((it) => ({
      description: it.description, budgetCode: it.budgetCode,
      amount: it.amount, currency: it.currency,
    })),
    totalAmount: items.reduce((s, it) => s + (it.currency === 'USD' ? 0 : it.amount), 0),
    totalAmountUsd: items.reduce((s, it) => s + (it.currency === 'USD' ? it.amount : 0), 0),
    receipts: [],
    requestedBy: { uid: 'u', name: 'n', email: 'e' },
    reviewedBy: null, reviewedAt: null, approvedBy: null,
    requestedBySignature: null, approvalSignature: null, approvedAt: null,
    rejectionReason: null, settlementId: null, originalRequestId: null,
    comments: '',
  } as PaymentRequest)

  it('keeps only operations + approved/settled', () => {
    const reqs = [
      mkReq('rA', 'approved', 'operations', [{ amount: 1000, budgetCode: 5862, description: 'a' }]),
      mkReq('rB', 'pending',  'operations', [{ amount: 1000, budgetCode: 5862, description: 'b' }]),
      mkReq('rC', 'approved', 'preparation', [{ amount: 1000, budgetCode: 5862, description: 'c' }]),
      mkReq('rD', 'settled',  'operations', [{ amount: 1000, budgetCode: 5862, description: 'd' }]),
    ]
    const out = diffIncludableItems(reqs, [])
    expect(out.map((i) => i.requestId).sort()).toEqual(['rA', 'rD'])
  })

  it('flattens to per-item entries with itemIndex', () => {
    const reqs = [
      mkReq('rA', 'approved', 'operations', [
        { amount: 100, budgetCode: 5862, description: 'a' },
        { amount: 200, budgetCode: 5110, description: 'b' },
      ]),
    ]
    const out = diffIncludableItems(reqs, [])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ requestId: 'rA', itemIndex: 0 })
    expect(out[1]).toMatchObject({ requestId: 'rA', itemIndex: 1 })
  })

  it('excludes items already included in any category', () => {
    const reqs = [
      mkReq('rA', 'approved', 'operations', [
        { amount: 100, budgetCode: 5862, description: 'a' },
        { amount: 200, budgetCode: 5862, description: 'b' },
      ]),
    ]
    const incs: OpsBudgetInclusion[] = [
      baseInclusion({ id: 'rA__0', requestId: 'rA', itemIndex: 0 }),
    ]
    const out = diffIncludableItems(reqs, incs)
    expect(out).toHaveLength(1)
    expect(out[0].itemIndex).toBe(1)
  })

  it('handles Firestore Timestamp objects for createdAt (no .getTime)', () => {
    const mkReqTs = (id: string, isoDate: string): PaymentRequest => ({
      ...mkReq(id, 'approved', 'operations', [{ amount: 100, budgetCode: 5862, description: 'a' }]),
      createdAt: { toDate: () => new Date(isoDate) } as unknown as Date,
    })
    const reqs = [mkReqTs('older', '2026-01-01'), mkReqTs('newer', '2026-06-01')]
    const out = diffIncludableItems(reqs, [])
    expect(out[0].requestId).toBe('newer')
    expect(out[1].requestId).toBe('older')
  })
})

describe('paletteColor', () => {
  it('returns deterministic color from sortIndex', () => {
    expect(paletteColor(0)).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(paletteColor(0)).toBe(paletteColor(0))
  })
  it('wraps around for indexes beyond palette length', () => {
    expect(paletteColor(10)).toBe(paletteColor(0))
    expect(paletteColor(15)).toBe(paletteColor(5))
    expect(paletteColor(100)).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})

describe('computeRedistributeContext', () => {
  const cats: OpsBudgetCategory[] = [
    { id: 'c1', name: 'A', budgetCode: 5862, allocatedKrw: 1000, sortIndex: 0 },
    { id: 'c2', name: 'B', budgetCode: 5110, allocatedKrw: 2000, sortIndex: 1 },
  ]

  it('returns deficit > 0 when sum exceeds total', () => {
    const ctx = computeRedistributeContext(cats, { id: 'new', allocatedKrw: 5000 }, true, 5000)
    // others sum = 1000+2000 = 3000; new sum = 3000+5000 = 8000; deficit = 8000-5000 = 3000
    expect(ctx.deficit).toBe(3000)
    expect(ctx.newSum).toBe(8000)
    expect(ctx.availablePool).toHaveLength(2)
  })

  it('returns deficit ≤ 0 when within total', () => {
    const ctx = computeRedistributeContext(cats, { id: 'new', allocatedKrw: 1000 }, true, 5000)
    // others sum = 3000; new sum = 4000; deficit = 4000-5000 = -1000
    expect(ctx.deficit).toBe(-1000)
  })

  it('treats totalKrw=0 as unconstrained (deficit always 0)', () => {
    const ctx = computeRedistributeContext(cats, { id: 'new', allocatedKrw: 5000 }, true, 0)
    expect(ctx.deficit).toBe(0)
  })

  it('excludes the draft category from the pool when editing', () => {
    // Editing c1 (currently 1000) to 4000; others = [c2 with 2000]
    const ctx = computeRedistributeContext(cats, { id: 'c1', allocatedKrw: 4000 }, false, 5000)
    expect(ctx.availablePool.map((p) => p.id)).toEqual(['c2'])
    // newSum = 2000 + 4000 = 6000; deficit = 6000 - 5000 = 1000
    expect(ctx.deficit).toBe(1000)
  })
})

describe('computeReduceTotalContext', () => {
  const cats: OpsBudgetCategory[] = [
    { id: 'c1', name: 'A', budgetCode: 5862, allocatedKrw: 1000, sortIndex: 0 },
    { id: 'c2', name: 'B', budgetCode: 5110, allocatedKrw: 2000, sortIndex: 1 },
  ]

  it('returns deficit > 0 when reducing below sum', () => {
    // currentSum = 3000; newTotal = 2000; deficit = 1000
    expect(computeReduceTotalContext(cats, 2000).deficit).toBe(1000)
  })

  it('returns deficit ≤ 0 when new total ≥ sum', () => {
    // currentSum = 3000; newTotal = 4000; deficit = -1000
    expect(computeReduceTotalContext(cats, 4000).deficit).toBe(-1000)
  })

  it('pool includes all categories', () => {
    expect(computeReduceTotalContext(cats, 2000).availablePool).toHaveLength(2)
  })
})
