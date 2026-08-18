import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CorporateCardSplitDialog from './CorporateCardSplitDialog'
import type { RequestItem, Receipt } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } })
}))

const items: RequestItem[] = [
  { description: '식사비', budgetCode: 101, amount: 50000 },
  { description: '주유비', budgetCode: 102, amount: 100000 }
]
const receipts: Receipt[] = [
  { fileName: 'a.jpg', storagePath: 'a.jpg', url: 'https://x/a' },
  { fileName: 'b.jpg', storagePath: 'b.jpg', url: 'https://x/b' }
]

function setup(overrides = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <CorporateCardSplitDialog
      open
      items={items}
      receipts={receipts}
      submitting={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  )
  return { onConfirm, onCancel }
}

describe('CorporateCardSplitDialog', () => {
  const confirmButton = () =>
    screen.getByRole('button', { name: 'corporateCardSplit.confirm' })

  it('disables confirm when nothing is selected', () => {
    setup()
    expect(confirmButton()).toBeDisabled()
  })

  it('disables confirm when every item is selected', () => {
    setup()
    fireEvent.click(screen.getByLabelText('식사비'))
    fireEvent.click(screen.getByLabelText('주유비'))
    expect(confirmButton()).toBeDisabled()
  })

  it('enables confirm for a partial selection', () => {
    setup()
    fireEvent.click(screen.getByLabelText('주유비'))
    expect(confirmButton()).not.toBeDisabled()
  })

  it('reports selected item indexes and receipt paths', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByLabelText('주유비'))
    fireEvent.click(screen.getByLabelText('b.jpg'))
    fireEvent.click(confirmButton())
    expect(onConfirm).toHaveBeenCalledWith([1], ['b.jpg'])
  })

  it('shows a live total for each side', () => {
    setup()
    fireEvent.click(screen.getByLabelText('주유비'))
    expect(screen.getByTestId('original-total')).toHaveTextContent('50,000')
    expect(screen.getByTestId('corporate-total')).toHaveTextContent('100,000')
  })
})
