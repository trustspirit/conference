import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

// BankBookPreview는 이미지/PDF 로딩을 하므로 렌더만 스텁한다.
vi.mock('./BankBookPreview', () => ({
  default: () => null
}))

import ReceiptGallery from './ReceiptGallery'
import type { Receipt } from '../types'

const receipts: Receipt[] = [
  { fileName: 'a.jpg', storagePath: 'a', url: 'https://x/a.jpg' },
  { fileName: 'b.jpg', storagePath: 'b', url: 'https://x/b.jpg' }
]

describe('ReceiptGallery 표시 크기 배지', () => {
  it("기본값이 normal이면 large로 지정된 영수증에만 '크게' 배지를 단다", () => {
    render(<ReceiptGallery receipts={receipts} displaySizes={{ a: 'large' }} />)
    expect(screen.getAllByText('receipts.sizeLargeBadge')).toHaveLength(1)
    expect(screen.queryByText('receipts.sizeNormalBadge')).toBeNull()
  })

  it("기본값이 large이면 normal로 지정된 영수증에만 '일반' 배지를 단다", () => {
    render(
      <ReceiptGallery receipts={receipts} displaySizes={{ a: 'normal' }} defaultSize="large" />
    )
    expect(screen.getAllByText('receipts.sizeNormalBadge')).toHaveLength(1)
    expect(screen.queryByText('receipts.sizeLargeBadge')).toBeNull()
  })

  it('명시값이 없고 기본값만 있으면 아무 배지도 달지 않는다', () => {
    render(<ReceiptGallery receipts={receipts} defaultSize="large" />)
    expect(screen.queryByText('receipts.sizeLargeBadge')).toBeNull()
    expect(screen.queryByText('receipts.sizeNormalBadge')).toBeNull()
  })

  it('기본값이 large면 명시값 없는 영수증의 토글은 normal로 내린다', () => {
    const onToggleDisplaySize = vi.fn()
    render(
      <ReceiptGallery
        receipts={receipts}
        defaultSize="large"
        onToggleDisplaySize={onToggleDisplaySize}
      />
    )
    // 타일당 버튼은 토글 하나뿐이다 (썸네일 자체는 <a>).
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onToggleDisplaySize).toHaveBeenCalledWith('a', 'normal')
  })
})
