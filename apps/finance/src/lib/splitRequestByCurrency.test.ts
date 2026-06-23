import { describe, it, expect } from 'vitest'
import {
  hasMixedCurrency,
  missingReceiptCurrencies,
  splitRequestByCurrency,
  type NewRequest
} from './splitRequestByCurrency'
import type { RequestItem, Receipt } from '../types'

const item = (over: Partial<RequestItem> = {}): RequestItem => ({
  description: 'x',
  budgetCode: 5200,
  amount: 100,
  currency: 'KRW',
  ...over
})

const receipt = (path: string): Receipt => ({
  fileName: path,
  storagePath: path,
  url: `https://x/${path}`
})

const baseReq = (over: Partial<NewRequest> = {}): NewRequest =>
  ({
    projectId: 'p1',
    status: 'pending',
    payee: 'Alice',
    phone: '010',
    bankName: 'Bank',
    bankAccount: '123',
    date: '2026-06-23',
    session: 'S1',
    committee: 'operations',
    items: [item()],
    totalAmount: 100,
    receipts: [],
    requestedBy: { uid: 'u1', name: 'Alice', email: 'a@x.com' },
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    requestedBySignature: null,
    approvalSignature: null,
    approvedAt: null,
    rejectionReason: null,
    settlementId: null,
    originalRequestId: null,
    comments: '',
    ...over
  }) as NewRequest

describe('hasMixedCurrency', () => {
  it('false for single-currency lists', () => {
    expect(hasMixedCurrency([item({ currency: 'KRW' })])).toBe(false)
    expect(hasMixedCurrency([item({ currency: 'USD' })])).toBe(false)
  })
  it('true when both currencies present', () => {
    expect(hasMixedCurrency([item({ currency: 'KRW' }), item({ currency: 'USD' })])).toBe(true)
  })
})

describe('missingReceiptCurrencies', () => {
  const items = [item({ currency: 'KRW', amount: 10 }), item({ currency: 'USD', amount: 5 })]
  it('flags a side with items but no assigned receipts', () => {
    // both receipts assigned to KRW (usdPaths empty) → USD side missing
    const receipts = [receipt('r1'), receipt('r2')]
    expect(missingReceiptCurrencies(items, receipts, new Set())).toEqual(['USD'])
  })
  it('no missing when each side has a receipt', () => {
    const receipts = [receipt('r1'), receipt('r2')]
    expect(missingReceiptCurrencies(items, receipts, new Set(['r2']))).toEqual([])
  })
  it('car-only KRW side needs no receipt', () => {
    const carItems = [
      item({ currency: 'KRW', amount: 10, transportDetail: { transportType: 'car', tripType: 'round', departure: 'a', destination: 'b' } }),
      item({ currency: 'USD', amount: 5 })
    ]
    // only a USD receipt; KRW side is car-only → not flagged
    expect(missingReceiptCurrencies(carItems, [receipt('r1')], new Set(['r1']))).toEqual([])
  })
})

describe('splitRequestByCurrency', () => {
  it('single-currency request passes through unchanged', () => {
    const req = baseReq({ items: [item({ currency: 'KRW', amount: 100 })], totalAmount: 100 })
    expect(splitRequestByCurrency(req, new Set())).toEqual([req])
  })

  it('splits mixed request by item currency and receipt assignment', () => {
    const req = baseReq({
      items: [item({ currency: 'KRW', amount: 100 }), item({ currency: 'USD', amount: 5 })],
      totalAmount: 100,
      totalAmountUsd: 5,
      receipts: [receipt('k'), receipt('u')]
    })
    const out = splitRequestByCurrency(req, new Set(['u']))
    expect(out).toHaveLength(2)
    const krw = out.find((r) => r.totalAmount === 100)!
    const usd = out.find((r) => r.totalAmountUsd === 5)!
    expect(krw.items.map((i) => i.currency)).toEqual(['KRW'])
    expect(krw.receipts.map((r) => r.storagePath)).toEqual(['k'])
    expect(krw.totalAmountUsd).toBeUndefined()
    expect(usd.items.map((i) => i.currency)).toEqual(['USD'])
    expect(usd.receipts.map((r) => r.storagePath)).toEqual(['u'])
    expect(usd.totalAmount).toBe(0)
    // shared fields duplicated
    expect(krw.payee).toBe('Alice')
    expect(usd.payee).toBe('Alice')
  })

  it('all receipts assigned to one side leaves the other with none', () => {
    const req = baseReq({
      items: [item({ currency: 'KRW', amount: 1 }), item({ currency: 'USD', amount: 2 })],
      totalAmount: 1,
      totalAmountUsd: 2,
      receipts: [receipt('a'), receipt('b')]
    })
    const out = splitRequestByCurrency(req, new Set(['a', 'b']))
    const krw = out.find((r) => r.totalAmount === 1)!
    expect(krw.receipts).toEqual([])
  })
})
