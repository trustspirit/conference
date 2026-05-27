import { describe, it, expect, vi } from 'vitest'

// Mock Firebase dependencies so the module can be imported in a non-browser test env
vi.mock('@conference/firebase', () => ({
  db: {},
}))
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()
  return {
    ...actual,
    collection: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: vi.fn(),
    onSnapshot: vi.fn(),
  }
})

import { mapInclusionDoc, mapInclusionDocs, annotateAllOperationsItems } from './useOpsBudget'
import type { Timestamp } from 'firebase/firestore'

const ts = (d: string) => ({ toDate: () => new Date(d) } as unknown as Timestamp)

describe('mapInclusionDoc', () => {
  it('hydrates Firestore Timestamps to Date', () => {
    const out = mapInclusionDoc('r1__0', {
      categoryId: 'c1', requestId: 'r1', itemIndex: 0,
      snapshot: {
        amount: 100, amountUsd: 0, currency: 'KRW', budgetCode: 5862,
        description: 'x', payee: 'p', date: '2026-05-01',
        session: 'S1', requestStatus: 'approved',
      },
      addedBy: { uid: 'u', name: 'n', email: 'e' },
      addedAt: ts('2026-05-10'),
    } as any)
    expect(out.id).toBe('r1__0')
    expect(out.addedAt).toBeInstanceOf(Date)
    expect(out.addedAt.toISOString().startsWith('2026-05-10')).toBe(true)
  })

  it('uses .toDate() when value is a real Timestamp instance', async () => {
    // Get the real (un-mocked) Timestamp via vi.importActual
    const { Timestamp: RealTimestamp } = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
    const real = RealTimestamp.fromDate(new Date('2026-05-10T00:00:00Z'))
    const out = mapInclusionDoc('r1__0', {
      categoryId: 'c1', requestId: 'r1', itemIndex: 0,
      snapshot: {
        amount: 100, amountUsd: 0, currency: 'KRW', budgetCode: 5862,
        description: 'x', payee: 'p', date: '2026-05-01',
        session: 'S1', requestStatus: 'approved',
      },
      addedBy: { uid: 'u', name: 'n', email: 'e' },
      addedAt: real,
    } as any)
    expect(out.addedAt).toBeInstanceOf(Date)
    expect(out.addedAt.toISOString()).toBe('2026-05-10T00:00:00.000Z')
  })
})

describe('mapInclusionDocs', () => {
  it('maps an array', () => {
    const docs = [
      { id: 'a__0', data: () => ({
        categoryId: 'c1', requestId: 'a', itemIndex: 0,
        snapshot: {
          amount: 1, amountUsd: 0, currency: 'KRW', budgetCode: 5862,
          description: '', payee: '', date: '', session: '',
          requestStatus: 'approved',
        },
        addedBy: { uid: '', name: '', email: '' },
        addedAt: ts('2026-05-10'),
      }) },
    ] as any
    const out = mapInclusionDocs(docs)
    expect(out).toHaveLength(1)
    expect(out[0].requestId).toBe('a')
  })
})

describe('annotateAllOperationsItems', () => {
  const baseReq = (
    id: string,
    status: 'approved' | 'settled' | 'pending',
    committee: 'operations' | 'preparation'
  ) => ({
    id, projectId: 'p1',
    createdAt: new Date('2026-05-01'),
    status, payee: 'P', phone: '', bankName: '', bankAccount: '',
    date: '2026-05-01', session: 'S1', committee,
    items: [
      { description: 'x', budgetCode: 5862, amount: 100, currency: 'KRW' as const },
    ],
    totalAmount: 100, totalAmountUsd: 0, receipts: [],
    requestedBy: { uid: 'u', name: 'n', email: 'e' },
    reviewedBy: null, reviewedAt: null, approvedBy: null,
    requestedBySignature: null, approvalSignature: null, approvedAt: null,
    rejectionReason: null, settlementId: null, originalRequestId: null,
    comments: '',
  })

  const baseInclusion = (requestId: string, itemIndex: number, categoryId: string) => ({
    id: `${requestId}__${itemIndex}`,
    categoryId, requestId, itemIndex,
    snapshot: {
      amount: 100, amountUsd: 0, currency: 'KRW' as const,
      budgetCode: 5862, description: 'x', payee: 'P',
      date: '2026-05-01', session: 'S1', requestStatus: 'approved' as const,
    },
    addedBy: { uid: 'u', name: 'n', email: 'e' },
    addedAt: new Date(),
  })

  it('includes approved/settled operations items with null assignedCategoryId when not included', () => {
    const reqs = [baseReq('r1', 'approved', 'operations')] as any[]
    const inclusions: any[] = []
    const out = annotateAllOperationsItems(reqs, inclusions)
    expect(out).toHaveLength(1)
    expect(out[0].assignedCategoryId).toBeNull()
  })

  it('annotates already-included items with their categoryId', () => {
    const reqs = [baseReq('r1', 'approved', 'operations')] as any[]
    const inclusions = [baseInclusion('r1', 0, 'cat-A')]
    const out = annotateAllOperationsItems(reqs, inclusions)
    expect(out).toHaveLength(1)
    expect(out[0].assignedCategoryId).toBe('cat-A')
  })

  it('excludes non-operations and non-approved/settled requests', () => {
    const reqs = [
      baseReq('r1', 'pending', 'operations'),
      baseReq('r2', 'approved', 'preparation'),
      baseReq('r3', 'settled', 'operations'),
    ] as any[]
    const out = annotateAllOperationsItems(reqs, [])
    expect(out.map((i: any) => i.requestId)).toEqual(['r3'])
  })
})
