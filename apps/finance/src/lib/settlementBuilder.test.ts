import { describe, it, expect } from 'vitest'
import { buildSettlementDocs, type BuildSettlementDocsInput } from './settlementBuilder'
import type { PaymentRequest, RequestItem } from '../types'

const item = (over: Partial<RequestItem> = {}): RequestItem => ({
  description: 'x',
  budgetCode: 5200,
  amount: 100,
  ...over
})

const req = (over: Partial<PaymentRequest> = {}): PaymentRequest => ({
  id: 'r1',
  projectId: 'p1',
  createdAt: new Date(),
  status: 'approved',
  payee: 'Alice',
  phone: '010',
  bankName: 'Bank',
  bankAccount: '123',
  date: '2026-06-23',
  session: 'S1',
  committee: 'operations',
  items: [item({ currency: 'KRW', amount: 1000 })],
  totalAmount: 1000,
  receipts: [],
  requestedBy: { uid: 'u1', name: 'Alice', email: 'a@x.com' },
  reviewedBy: null,
  reviewedAt: null,
  approvedBy: { uid: 'u9', name: 'Boss', email: 'b@x.com' },
  approvedAt: null,
  approvalSignature: 'sig',
  requestedBySignature: null,
  rejectionReason: null,
  settlementId: null,
  originalRequestId: null,
  comments: '',
  ...over
}) as PaymentRequest

// Deterministic resolver: one stable id per (cardType, currency).
const baseInput = (
  groupedByPayee: Record<string, PaymentRequest[]>
): BuildSettlementDocsInput => ({
  groupedByPayee,
  projectId: 'p1',
  creator: { uid: 'u0', name: 'Creator', email: 'c@x.com' },
  creatorSignature: null,
  userDataByUid: new Map(),
  resolveBatchId: (cc, cur) => `${cc ? 'cc' : 'reg'}:${cur}`
})

describe('buildSettlementDocs', () => {
  it('KRW-only selection produces one KRW doc', () => {
    const docs = buildSettlementDocs(baseInput({ a: [req()] }))
    expect(docs).toHaveLength(1)
    expect(docs[0].currency).toBe('KRW')
    expect(docs[0].batchId).toBe('reg:KRW')
    expect(docs[0].totalAmount).toBe(1000)
    expect(docs[0].totalAmountUsd).toBeUndefined()
  })

  it('mixed-currency single request splits into two batches', () => {
    const mixed = req({
      items: [item({ currency: 'KRW', amount: 1000 }), item({ currency: 'USD', amount: 50 })]
    })
    const docs = buildSettlementDocs(baseInput({ a: [mixed] }))
    expect(docs).toHaveLength(2)
    const krw = docs.find((d) => d.currency === 'KRW')!
    const usd = docs.find((d) => d.currency === 'USD')!
    expect(krw.batchId).toBe('reg:KRW')
    expect(usd.batchId).toBe('reg:USD')
    expect(krw.batchId).not.toBe(usd.batchId)
    expect(krw.totalAmount).toBe(1000)
    expect(usd.totalAmountUsd).toBe(50)
    expect(usd.totalAmount).toBe(0)
  })

  it('attaches a mixed request receipts to both currency docs', () => {
    const mixed = req({
      receipts: [{ url: 'u', fileName: 'n', storagePath: 'p' }] as PaymentRequest['receipts'],
      items: [item({ currency: 'KRW', amount: 1 }), item({ currency: 'USD', amount: 2 })]
    })
    const docs = buildSettlementDocs(baseInput({ a: [mixed] }))
    const krw = docs.find((d) => d.currency === 'KRW')!
    const usd = docs.find((d) => d.currency === 'USD')!
    expect(krw.receipts).toHaveLength(1)
    expect(usd.receipts).toHaveLength(1)
  })

  it('corporate-card and regular currencies yield four distinct batches', () => {
    const regMixed = req({
      id: 'r1',
      items: [item({ currency: 'KRW', amount: 1 }), item({ currency: 'USD', amount: 2 })]
    })
    const ccMixed = req({
      id: 'r2',
      isCorporateCard: true,
      items: [item({ currency: 'KRW', amount: 3 }), item({ currency: 'USD', amount: 4 })]
    })
    const docs = buildSettlementDocs(baseInput({ reg: [regMixed], cc: [ccMixed] }))
    const ids = new Set(docs.map((d) => d.batchId))
    expect(ids).toEqual(new Set(['reg:KRW', 'reg:USD', 'cc:KRW', 'cc:USD']))
  })

  it('multi-payee single currency stays in one batch', () => {
    const a = req({ id: 'r1', payee: 'Alice' })
    const b = req({ id: 'r2', payee: 'Bob' })
    const docs = buildSettlementDocs(baseInput({ a: [a], b: [b] }))
    expect(docs).toHaveLength(2)
    expect(new Set(docs.map((d) => d.batchId))).toEqual(new Set(['reg:KRW']))
  })

  it('ignores an empty payee group without crashing', () => {
    const docs = buildSettlementDocs(baseInput({ empty: [], a: [req()] }))
    expect(docs).toHaveLength(1)
    expect(docs[0].batchId).toBe('reg:KRW')
  })
})
