import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button } from 'trust-ui-react'
import type { RequestItem, Receipt } from '../types'
import { getItemCurrency, sumByCurrency, formatAmount } from '../lib/currency'
import { missingReceiptCurrencies } from '../lib/splitRequestByCurrency'
import ReceiptThumb from './ReceiptThumb'

interface CurrencySplitDialogProps {
  open: boolean
  items: RequestItem[]
  receipts: Receipt[]
  submitting: boolean
  onConfirm: (usdReceiptPaths: Set<string>) => void
  onCancel: () => void
}

export default function CurrencySplitDialog({
  open,
  items,
  receipts,
  submitting,
  onConfirm,
  onCancel
}: CurrencySplitDialogProps) {
  const { t } = useTranslation()
  const [usdPaths, setUsdPaths] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setUsdPaths(new Set())
  }, [open])

  const toggle = (path: string) => {
    setUsdPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const krwItems = items.filter((i) => getItemCurrency(i) === 'KRW')
  const usdItems = items.filter((i) => getItemCurrency(i) === 'USD')
  const krwTotal = sumByCurrency(krwItems).krw
  const usdTotal = sumByCurrency(usdItems).usd
  const usdReceiptCount = receipts.filter((r) => usdPaths.has(r.storagePath)).length
  const krwReceiptCount = receipts.length - usdReceiptCount

  const missing = missingReceiptCurrencies(items, receipts, usdPaths)
  const canConfirm = missing.length === 0 && !submitting

  return (
    <Dialog open={open} onClose={onCancel} size="md">
      <Dialog.Title onClose={onCancel}>{t('currencySplit.title')}</Dialog.Title>
      <Dialog.Content>
        <p className="mb-3 text-sm text-finance-muted">{t('currencySplit.description')}</p>

        <ul className="mb-4 max-h-[45vh] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
          {receipts.map((r) => {
            const selected = usdPaths.has(r.storagePath)
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
                    onChange={() => toggle(r.storagePath)}
                  />
                  <ReceiptThumb url={r.url} fileName={r.fileName} />
                  <span className="min-w-0 flex-1 truncate text-sm">{r.fileName}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                      selected
                        ? 'bg-finance-primary text-white'
                        : 'bg-finance-surface text-finance-muted'
                    }`}
                  >
                    {selected ? t('currencySplit.usd') : 'KRW'}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:gap-3">
          <div className="rounded-lg border border-finance-border p-3">
            <div className="font-semibold">{t('currencySplit.krwRequest')}</div>
            <div className="text-base">{formatAmount(krwTotal, 'KRW')}</div>
            <div className="text-xs text-finance-muted">
              {t('currencySplit.receiptCount', { count: krwReceiptCount })}
            </div>
          </div>
          <div className="rounded-lg border border-finance-border p-3">
            <div className="font-semibold">{t('currencySplit.usdRequest')}</div>
            <div className="text-base">{formatAmount(usdTotal, 'USD')}</div>
            <div className="text-xs text-finance-muted">
              {t('currencySplit.receiptCount', { count: usdReceiptCount })}
            </div>
          </div>
        </div>

        {missing.length > 0 && (
          <p className="mt-3 text-xs text-finance-danger">{t('currencySplit.missingReceipts')}</p>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          {t('currencySplit.cancel')}
        </Button>
        <Button variant="primary" onClick={() => onConfirm(usdPaths)} disabled={!canConfirm}>
          {t('currencySplit.confirm')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}
