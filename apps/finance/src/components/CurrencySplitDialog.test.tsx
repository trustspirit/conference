import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CurrencySplitDialog from './CurrencySplitDialog'
import type { RequestItem, Receipt } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

const items: RequestItem[] = [
  { description: 'krw', budgetCode: 5200, amount: 100, currency: 'KRW' },
  { description: 'usd', budgetCode: 5200, amount: 5, currency: 'USD' }
]
const receipts: Receipt[] = [
  { fileName: 'a.jpg', storagePath: 'a', url: 'https://x/a' },
  { fileName: 'b.jpg', storagePath: 'b', url: 'https://x/b' }
]

describe('CurrencySplitDialog', () => {
  it('resets usd selection when dialog reopens after close', () => {
    const onConfirm = vi.fn()
    const props = {
      items,
      receipts,
      submitting: false,
      onConfirm,
      onCancel: () => {}
    }
    const { rerender } = render(<CurrencySplitDialog open {...props} />)

    const confirm = screen.getByRole('button', { name: 'currencySplit.confirm' })
    // Mark receipt 'a' as USD so confirm becomes enabled
    fireEvent.click(screen.getByLabelText('a.jpg'))
    expect(confirm).not.toBeDisabled()

    // Close the dialog, then reopen it
    rerender(<CurrencySplitDialog open={false} {...props} />)
    rerender(<CurrencySplitDialog open {...props} />)

    // Selection should be reset: checkbox unchecked, confirm disabled again
    expect(screen.getByLabelText('a.jpg')).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'currencySplit.confirm' })).toBeDisabled()
  })

  it('disables confirm while a currency side has no assigned receipt, enables after assignment', () => {
    const onConfirm = vi.fn()
    render(
      <CurrencySplitDialog
        open
        items={items}
        receipts={receipts}
        submitting={false}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )
    const confirm = screen.getByRole('button', { name: 'currencySplit.confirm' })
    // No receipts marked USD → USD side missing → disabled
    expect(confirm).toBeDisabled()

    // Mark receipt 'a' as USD
    fireEvent.click(screen.getByLabelText('a.jpg'))
    expect(confirm).not.toBeDisabled()

    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect([...onConfirm.mock.calls[0][0]]).toEqual(['a'])
  })
})
