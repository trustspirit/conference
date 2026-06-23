import { describe, it, expect } from 'vitest'
import { revertRequestAction } from './settlementRevert'

const BATCH = ['s1', 's2']

describe('revertRequestAction', () => {
  it("reverts a 'settled' request whose settlementId belongs to this batch", () => {
    expect(revertRequestAction('settled', 's1', BATCH)).toBe('revert')
  })
  it('skips a request whose settlementId belongs to a different batch (re-settled elsewhere)', () => {
    expect(revertRequestAction('settled', 's9', BATCH)).toBe('skip')
  })
  it("skips an already-'approved' request", () => {
    expect(revertRequestAction('approved', 's1', BATCH)).toBe('skip')
  })
  it('skips when settlementId is missing', () => {
    expect(revertRequestAction('settled', null, BATCH)).toBe('skip')
    expect(revertRequestAction('settled', undefined, BATCH)).toBe('skip')
  })
})
