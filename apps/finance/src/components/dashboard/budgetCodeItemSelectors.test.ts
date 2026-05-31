import { describe, it, expect } from 'vitest'
import {
  flattenRequestsToItems,
  filterByBudgetCode,
  searchItems,
  sortItems,
  type BudgetCodeItemRow,
} from './budgetCodeItemSelectors'
import { BUDGET_COUNTED_STATUSES } from '../../lib/budgetStatuses'
import type { PaymentRequest } from '../../types'

const baseRequest = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
  id: 'r1',
  projectId: 'p1',
  committee: 'operations',
  status: 'approved',
  createdAt: new Date(2026, 4, 10) as unknown as PaymentRequest['createdAt'],
  date: '2026-05-10',
  requestedBy: { uid: 'u1', name: '홍길동', email: 'a@b.c' },
  items: [
    { description: '호텔 2박', budgetCode: 5862, budgetDescKey: 'lodging', amount: 200000, currency: 'KRW' },
  ],
  totalAmount: 200000,
  ...overrides,
} as PaymentRequest)

describe('flattenRequestsToItems', () => {
  it('produces one row per item for counted requests', () => {
    const reqs: PaymentRequest[] = [
      baseRequest({
        id: 'r1',
        items: [
          { description: '호텔', budgetCode: 5862, budgetDescKey: 'lodging', amount: 100000, currency: 'KRW' },
          { description: '버스', budgetCode: 5110, budgetDescKey: 'transportParticipants', amount: 30000, currency: 'KRW' },
        ],
      }),
    ]
    const rows = flattenRequestsToItems(reqs, 1300, BUDGET_COUNTED_STATUSES)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ requestId: 'r1', itemIndex: 0, budgetCode: 5862, amountKrw: 100000 })
    expect(rows[1]).toMatchObject({ requestId: 'r1', itemIndex: 1, budgetCode: 5110, amountKrw: 30000 })
  })

  it('uses the actual submission timestamp (createdAt) as the displayed date', () => {
    const reqs = [
      baseRequest({
        id: 'r1',
        createdAt: new Date(2026, 1, 15) as unknown as PaymentRequest['createdAt'],
        date: '2026-02-10', // user-entered date differs; createdAt wins
      }),
    ]
    const rows = flattenRequestsToItems(reqs, 1300, BUDGET_COUNTED_STATUSES)
    expect(rows[0].date).toBe('2026-02-15')
  })

  it('falls back to req.date when createdAt is missing (no 1970 epoch)', () => {
    // Legacy/migrated requests can lack a valid createdAt; the displayed date
    // must fall back to req.date so it never renders as 1970-01-01.
    const reqs = [
      baseRequest({
        id: 'r1',
        date: '2025-12-31',
        createdAt: undefined as unknown as PaymentRequest['createdAt'],
      }),
    ]
    const rows = flattenRequestsToItems(reqs, 1300, BUDGET_COUNTED_STATUSES)
    expect(rows[0].date).toBe('2025-12-31')
    expect(rows[0].date.startsWith('1970')).toBe(false)
  })

  it('excludes requests whose status is not in the counted set', () => {
    const reqs = [
      baseRequest({ id: 'r1', status: 'approved' }),
      baseRequest({ id: 'r2', status: 'pending' }),
      baseRequest({ id: 'r3', status: 'rejected' }),
      baseRequest({ id: 'r4', status: 'cancelled' }),
      baseRequest({ id: 'r5', status: 'force_rejected' }),
      baseRequest({ id: 'r6', status: 'reviewed' }),
      baseRequest({ id: 'r7', status: 'settled' }),
    ]
    const rows = flattenRequestsToItems(reqs, 1300, BUDGET_COUNTED_STATUSES)
    expect(rows.map((r) => r.requestId).sort()).toEqual(['r1', 'r6', 'r7'])
  })

  it('converts USD items to KRW using the provided rate and keeps the USD amount', () => {
    const reqs = [
      baseRequest({
        items: [{ description: 'gear', budgetCode: 5200, amount: 100, currency: 'USD' }],
      }),
    ]
    const rows = flattenRequestsToItems(reqs, 1300, BUDGET_COUNTED_STATUSES)
    expect(rows[0].amountKrw).toBe(130000)
    expect(rows[0].amountUsd).toBe(100)
  })

  it('keeps USD items at amountKrw=0 when rate is 0 (no conversion configured)', () => {
    const reqs = [
      baseRequest({
        items: [{ description: 'gear', budgetCode: 5200, amount: 100, currency: 'USD' }],
      }),
    ]
    const rows = flattenRequestsToItems(reqs, 0, BUDGET_COUNTED_STATUSES)
    expect(rows[0].amountKrw).toBe(0)
    expect(rows[0].amountUsd).toBe(100)
  })

  it('treats missing currency as KRW (legacy items)', () => {
    const reqs = [
      baseRequest({
        items: [{ description: 'legacy', budgetCode: 5400, amount: 50000 }],
      }),
    ]
    const rows = flattenRequestsToItems(reqs, 0, BUDGET_COUNTED_STATUSES)
    expect(rows[0].amountKrw).toBe(50000)
    expect(rows[0].amountUsd).toBe(0)
  })
})

describe('filterByBudgetCode', () => {
  const rows: BudgetCodeItemRow[] = [
    { requestId: 'a', itemIndex: 0, date: '2026-05-01', submitterName: 's', committee: 'operations', budgetCode: 5862, description: '', amountKrw: 1, amountUsd: 0, status: 'approved' },
    { requestId: 'b', itemIndex: 0, date: '2026-05-01', submitterName: 's', committee: 'operations', budgetCode: 5110, description: '', amountKrw: 1, amountUsd: 0, status: 'approved' },
  ]

  it('returns all rows when filter is "all"', () => {
    expect(filterByBudgetCode(rows, 'all')).toHaveLength(2)
  })

  it('returns only rows matching the given code', () => {
    expect(filterByBudgetCode(rows, 5862)).toEqual([rows[0]])
  })
})

describe('searchItems', () => {
  const rows: BudgetCodeItemRow[] = [
    { requestId: 'a', itemIndex: 0, date: '2026-05-01', submitterName: '홍길동', committee: 'operations', budgetCode: 5862, description: '호텔 2박', amountKrw: 1, amountUsd: 0, status: 'approved' },
    { requestId: 'b', itemIndex: 0, date: '2026-05-01', submitterName: 'Alice', committee: 'preparation', budgetCode: 5110, description: 'Bus fare', amountKrw: 1, amountUsd: 0, status: 'approved' },
  ]

  it('returns all rows when query is empty', () => {
    expect(searchItems(rows, '')).toHaveLength(2)
    expect(searchItems(rows, '   ')).toHaveLength(2)
  })

  it('matches submitter name case-insensitively', () => {
    expect(searchItems(rows, 'alice')).toEqual([rows[1]])
  })

  it('matches description substring', () => {
    expect(searchItems(rows, '호텔')).toEqual([rows[0]])
  })
})

describe('sortItems', () => {
  const r = (overrides: Partial<BudgetCodeItemRow>): BudgetCodeItemRow => ({
    requestId: 'x', itemIndex: 0, date: '2026-01-01', submitterName: '', committee: 'operations',
    budgetCode: 5862, description: '', amountKrw: 0, amountUsd: 0, status: 'approved', ...overrides,
  })

  it('sorts by date desc by default semantics', () => {
    const rows = [r({ requestId: 'old', date: '2026-01-01' }), r({ requestId: 'new', date: '2026-05-01' })]
    expect(sortItems(rows, 'date', 'desc').map((x) => x.requestId)).toEqual(['new', 'old'])
    expect(sortItems(rows, 'date', 'asc').map((x) => x.requestId)).toEqual(['old', 'new'])
  })

  it('sorts by amountKrw', () => {
    const rows = [r({ requestId: 'small', amountKrw: 100 }), r({ requestId: 'big', amountKrw: 999 })]
    expect(sortItems(rows, 'amountKrw', 'desc').map((x) => x.requestId)).toEqual(['big', 'small'])
  })

  it('sorts by submitterName locale-aware', () => {
    const rows = [r({ requestId: 'b', submitterName: '나' }), r({ requestId: 'a', submitterName: '가' })]
    expect(sortItems(rows, 'submitterName', 'asc').map((x) => x.requestId)).toEqual(['a', 'b'])
  })
})
