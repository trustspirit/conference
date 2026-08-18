import { describe, it, expect } from 'vitest'
import { splitCorporateCard, canSplitRequest, SplitValidationError } from './splitCorporateCard'

const items = [
  { description: '식사비', amount: 50000 },
  { description: '주유비', amount: 100000 },
  { description: '해외 등록비', amount: 30, currency: 'USD' }
]
const receipts = [
  { storagePath: 'a.jpg', fileName: 'a.jpg', url: 'https://x/a' },
  { storagePath: 'b.jpg', fileName: 'b.jpg', url: 'https://x/b' }
]

function run(overrides = {}) {
  return splitCorporateCard({
    items,
    receipts,
    corporateItemIndexes: [1],
    corporateReceiptPaths: ['b.jpg'],
    ...overrides
  })
}

describe('splitCorporateCard', () => {
  it('partitions items so every item lands on exactly one side', () => {
    const r = run()
    expect(r.corporate.items).toEqual([items[1]])
    expect(r.original.items).toEqual([items[0], items[2]])
  })

  it('partitions receipts by storagePath', () => {
    const r = run()
    expect(r.corporate.receipts.map((x) => x.storagePath)).toEqual(['b.jpg'])
    expect(r.original.receipts.map((x) => x.storagePath)).toEqual(['a.jpg'])
  })

  it('recomputes KRW and USD totals per side', () => {
    const r = run()
    expect(r.corporate.totalAmount).toBe(100000)
    expect(r.original.totalAmount).toBe(50000)
    expect(r.original.totalAmountUsd).toBe(30)
  })

  it('omits totalAmountUsd when the side has no USD item', () => {
    const r = run()
    expect(r.corporate.totalAmountUsd).toBeUndefined()
  })

  it('treats an item without a currency field as KRW', () => {
    const r = splitCorporateCard({
      items: [{ description: 'x', amount: 1000 }, { description: 'y', amount: 2000 }],
      receipts: [],
      corporateItemIndexes: [0],
      corporateReceiptPaths: []
    })
    expect(r.corporate.totalAmount).toBe(1000)
    expect(r.corporate.totalAmountUsd).toBeUndefined()
  })

  it('splits receiptDisplaySizes so each key follows its receipt', () => {
    const r = run({ receiptDisplaySizes: { 'a.jpg': 'large', 'b.jpg': 'normal' } })
    expect(r.original.receiptDisplaySizes).toEqual({ 'a.jpg': 'large' })
    expect(r.corporate.receiptDisplaySizes).toEqual({ 'b.jpg': 'normal' })
  })

  it('leaves receiptDisplaySizes undefined when the source has none', () => {
    const r = run()
    expect(r.original.receiptDisplaySizes).toBeUndefined()
    expect(r.corporate.receiptDisplaySizes).toBeUndefined()
  })

  it('rejects an empty selection', () => {
    expect(() => run({ corporateItemIndexes: [] })).toThrow(SplitValidationError)
    expect(() => run({ corporateItemIndexes: [] })).toThrow('EMPTY_SELECTION')
  })

  it('rejects selecting every item — the original would be left empty', () => {
    expect(() => run({ corporateItemIndexes: [0, 1, 2] })).toThrow('FULL_SELECTION')
  })

  it('rejects an out-of-range index', () => {
    expect(() => run({ corporateItemIndexes: [5] })).toThrow('INDEX_OUT_OF_RANGE')
    expect(() => run({ corporateItemIndexes: [-1] })).toThrow('INDEX_OUT_OF_RANGE')
    expect(() => run({ corporateItemIndexes: [1.5] })).toThrow('INDEX_OUT_OF_RANGE')
  })

  it('rejects a duplicated index', () => {
    expect(() => run({ corporateItemIndexes: [1, 1] })).toThrow('DUPLICATE_INDEX')
  })

  it('rejects a receipt path that is not on the request', () => {
    expect(() => run({ corporateReceiptPaths: ['zzz.jpg'] })).toThrow('UNKNOWN_RECEIPT_PATH')
  })

  it('allows sending no receipt to the corporate side', () => {
    const r = run({ corporateReceiptPaths: [] })
    expect(r.corporate.receipts).toEqual([])
    expect(r.original.receipts).toHaveLength(2)
  })
})

describe('canSplitRequest', () => {
  it('allows admin on any committee', () => {
    expect(canSplitRequest('admin', 'operations')).toBe(true)
    expect(canSplitRequest('admin', 'preparation')).toBe(true)
  })

  it('allows finance_prep on any committee', () => {
    expect(canSplitRequest('finance_prep', 'preparation')).toBe(true)
  })

  it('scopes finance_ops and approver_ops to operations', () => {
    expect(canSplitRequest('finance_ops', 'operations')).toBe(true)
    expect(canSplitRequest('finance_ops', 'preparation')).toBe(false)
    expect(canSplitRequest('approver_ops', 'operations')).toBe(true)
    expect(canSplitRequest('approver_ops', 'preparation')).toBe(false)
  })

  it('scopes session_director to operations', () => {
    expect(canSplitRequest('session_director', 'operations')).toBe(true)
    expect(canSplitRequest('session_director', 'preparation')).toBe(false)
  })

  it('scopes approver_prep and logistic_admin to preparation', () => {
    expect(canSplitRequest('approver_prep', 'preparation')).toBe(true)
    expect(canSplitRequest('approver_prep', 'operations')).toBe(false)
    expect(canSplitRequest('logistic_admin', 'preparation')).toBe(true)
  })

  it('allows executive everywhere and rejects plain users and unknown roles', () => {
    expect(canSplitRequest('executive', 'operations')).toBe(true)
    expect(canSplitRequest('user', 'operations')).toBe(false)
    expect(canSplitRequest(null, 'operations')).toBe(false)
  })
})
