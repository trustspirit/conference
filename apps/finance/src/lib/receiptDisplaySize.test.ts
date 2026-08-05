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

  it("storagePath가 없으면 기본값을 무시하고 'normal'이다", () => {
    // storagePath가 신원이므로, 그게 없으면 갤러리가 토글 버튼을 숨긴다. 되돌릴 수단이
    // 없는 영수증을 프로젝트 기본값이 'large'로 쓸어담지 않도록 여기서 끊는다.
    expect(resolveReceiptDisplaySize({}, '', 'large')).toBe('normal')
    expect(resolveReceiptDisplaySize(undefined, '', 'large')).toBe('normal')
    // 빈 키로 저장된 항목이 있어도 그 영수증의 것이라고 볼 수 없다.
    expect(resolveReceiptDisplaySize({ '': 'large' }, '', 'large')).toBe('normal')
  })
})
