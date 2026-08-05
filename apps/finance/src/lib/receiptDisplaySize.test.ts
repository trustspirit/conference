import { describe, it, expect } from 'vitest'
import { resolveReceiptDisplaySize } from './receiptDisplaySize'

describe('resolveReceiptDisplaySize', () => {
  it('명시값이 프로젝트 기본값을 이긴다', () => {
    expect(resolveReceiptDisplaySize({ a: 'normal' }, 'a', 'large')).toBe('normal')
    expect(resolveReceiptDisplaySize({ a: 'large' }, 'a', 'normal')).toBe('large')
  })

  it('명시값이 없으면 프로젝트 기본값을 상속한다', () => {
    expect(resolveReceiptDisplaySize({ b: 'large' }, 'a', 'large')).toBe('large')
    expect(resolveReceiptDisplaySize({}, 'a', 'normal')).toBe('normal')
  })

  it("둘 다 없으면 'normal'이다 (기존 동작 하위 호환)", () => {
    expect(resolveReceiptDisplaySize(undefined, 'a', undefined)).toBe('normal')
    expect(resolveReceiptDisplaySize({}, 'a', undefined)).toBe('normal')
  })

  it('빈 storagePath는 기본값으로 떨어진다', () => {
    expect(resolveReceiptDisplaySize({ '': 'large' }, '', 'normal')).toBe('large')
    expect(resolveReceiptDisplaySize({}, '', 'large')).toBe('large')
  })
})
