import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button } from 'trust-ui-react'
import type { RequestItem, Receipt } from '../types'
import { getItemCurrency, sumByCurrency, formatAmount, formatTotals } from '../lib/currency'
import ReceiptThumb from './ReceiptThumb'

interface CorporateCardSplitDialogProps {
  open: boolean
  items: RequestItem[]
  receipts: Receipt[]
  submitting: boolean
  onConfirm: (itemIndexes: number[], receiptPaths: string[]) => void
  onCancel: () => void
}

export default function CorporateCardSplitDialog({
  open,
  items,
  receipts,
  submitting,
  onConfirm,
  onCancel
}: CorporateCardSplitDialogProps) {
  const { t } = useTranslation()
  const [itemIndexes, setItemIndexes] = useState<Set<number>>(new Set())
  const [receiptPaths, setReceiptPaths] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setItemIndexes(new Set())
      setReceiptPaths(new Set())
    }
  }, [open])

  const toggleItem = (i: number) =>
    setItemIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const togglePath = (p: string) =>
    setReceiptPaths((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })

  const corporateItems = items.filter((_, i) => itemIndexes.has(i))
  const originalItems = items.filter((_, i) => !itemIndexes.has(i))
  const corporateSums = sumByCurrency(corporateItems)
  const originalSums = sumByCurrency(originalItems)
  const corporateReceiptCount = receipts.filter((r) => receiptPaths.has(r.storagePath)).length
  const originalReceiptCount = receipts.length - corporateReceiptCount

  // 최소 1개는 선택해야 하고, 전부 선택하면 원본이 비게 되므로 둘 다 막는다.
  const canConfirm = itemIndexes.size > 0 && itemIndexes.size < items.length && !submitting

  return (
    <Dialog open={open} onClose={onCancel} size="md">
      <Dialog.Title onClose={onCancel}>{t('corporateCardSplit.title')}</Dialog.Title>
      <Dialog.Content>
        <p className="mb-3 text-sm text-finance-muted">{t('corporateCardSplit.description')}</p>

        <h4 className="mb-2 text-xs font-semibold text-finance-muted">
          {t('corporateCardSplit.itemsLabel')}
        </h4>
        <ul className="mb-4 max-h-[30vh] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
          {items.map((item, i) => {
            const selected = itemIndexes.has(i)
            return (
              <li key={i}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                    selected
                      ? 'border-finance-primary bg-finance-primary-surface'
                      : 'border-finance-border hover:bg-finance-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="finance-checkbox shrink-0"
                    aria-label={item.description}
                    checked={selected}
                    onChange={() => toggleItem(i)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{item.description}</span>
                  <span className="shrink-0 text-sm font-medium">
                    {formatAmount(item.amount, getItemCurrency(item))}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        {receipts.length > 0 && (
          <>
            <h4 className="mb-2 text-xs font-semibold text-finance-muted">
              {t('corporateCardSplit.receiptsLabel')}
            </h4>
            <ul className="mb-4 max-h-[30vh] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              {receipts.map((r) => {
                const selected = receiptPaths.has(r.storagePath)
                return (
                  <li key={r.storagePath}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                        selected
                          ? 'border-finance-primary bg-finance-primary-surface'
                          : 'border-finance-border hover:bg-finance-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="finance-checkbox shrink-0"
                        aria-label={r.fileName}
                        checked={selected}
                        onChange={() => togglePath(r.storagePath)}
                      />
                      <ReceiptThumb url={r.url} fileName={r.fileName} />
                      <span className="min-w-0 flex-1 truncate text-sm">{r.fileName}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-3">
          <div className="rounded-lg border border-finance-border p-3">
            <div className="font-semibold">{t('corporateCardSplit.originalRequest')}</div>
            <div className="text-base" data-testid="original-total">
              {formatTotals(originalSums.krw, originalSums.usd)}
            </div>
            <div className="text-xs text-finance-muted">
              {t('corporateCardSplit.receiptCount', { count: originalReceiptCount })}
            </div>
          </div>
          <div className="rounded-lg border border-finance-border p-3">
            <div className="font-semibold">{t('corporateCardSplit.corporateRequest')}</div>
            <div className="text-base" data-testid="corporate-total">
              {formatTotals(corporateSums.krw, corporateSums.usd)}
            </div>
            <div className="text-xs text-finance-muted">
              {t('corporateCardSplit.receiptCount', { count: corporateReceiptCount })}
            </div>
          </div>
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          {t('corporateCardSplit.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm([...itemIndexes].sort((a, b) => a - b), [...receiptPaths])}
          disabled={!canConfirm}
        >
          {t('corporateCardSplit.confirm')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}
