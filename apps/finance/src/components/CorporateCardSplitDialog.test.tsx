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
    fireEvent.click(screen.getByLabelText('b.jpg'))
    expect(screen.getByTestId('original-total')).toHaveTextContent('50,000')
    expect(screen.getByTestId('corporate-total')).toHaveTextContent('100,000')
  })

  it('disables confirm when the corporate side gets no receipt', () => {
    setup()
    fireEvent.click(screen.getByLabelText('주유비'))
    expect(confirmButton()).toBeDisabled()
  })

  it('enables confirm once the corporate side has one receipt assigned', () => {
    setup()
    fireEvent.click(screen.getByLabelText('주유비'))
    fireEvent.click(screen.getByLabelText('b.jpg'))
    expect(confirmButton()).not.toBeDisabled()
  })

  it('disables confirm when the original side gets no receipt', () => {
    setup()
    fireEvent.click(screen.getByLabelText('주유비'))
    fireEvent.click(screen.getByLabelText('a.jpg'))
    fireEvent.click(screen.getByLabelText('b.jpg'))
    expect(confirmButton()).toBeDisabled()
  })

  it('exempts a corporate side whose items are all car transport, even with zero receipts', () => {
    const carItems: RequestItem[] = [
      { description: '식사비', budgetCode: 101, amount: 50000 },
      {
        description: '이동비',
        budgetCode: 102,
        amount: 30000,
        transportDetail: {
          transportType: 'car',
          tripType: 'one_way',
          departure: '서울',
          destination: '부산',
          distanceKm: 10
        }
      }
    ]
    setup({ items: carItems })
    fireEvent.click(screen.getByLabelText('이동비'))
    expect(confirmButton()).not.toBeDisabled()
  })

  it('exempts both sides when the request has no receipts at all', () => {
    setup({ receipts: [] })
    fireEvent.click(screen.getByLabelText('주유비'))
    expect(confirmButton()).not.toBeDisabled()
  })

  it('shows the missing-receipts message only when that is the blocking reason', () => {
    setup()
    // No selection yet: confirm is disabled for the empty-selection reason, not receipts.
    expect(
      screen.queryByText('corporateCardSplit.missingReceipts')
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('주유비'))
    // Now disabled specifically because the corporate side has no receipt.
    expect(screen.getByText('corporateCardSplit.missingReceipts')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('b.jpg'))
    expect(
      screen.queryByText('corporateCardSplit.missingReceipts')
    ).not.toBeInTheDocument()
  })
})
