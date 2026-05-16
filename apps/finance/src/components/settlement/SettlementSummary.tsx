import { useTranslation } from 'react-i18next'
import { PaymentRequest } from '../../types'
import ProcessingOverlay from '../ProcessingOverlay'

interface Props {
  groupedByPayee: Record<string, PaymentRequest[]>
  reviewedCount: number
  rejectedCount: number
  includedTotal: number
  processing: boolean
  onSettle: () => void
  onBack: () => void
}

export default function SettlementSummary({
  groupedByPayee,
  reviewedCount,
  rejectedCount,
  includedTotal,
  processing,
  onSettle,
  onBack
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-[#002C5F] mb-6">{t('settlement.reviewSummary')}</h2>

      <div className="finance-panel rounded-lg p-4 mb-6 space-y-4 sm:p-6">
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
          <span className="finance-success-text font-medium">
            {t('settlement.includedCount', { count: reviewedCount })}
          </span>
          <span className="text-red-600 font-medium">
            {t('settlement.rejectedCount', { count: rejectedCount })}
          </span>
        </div>
        <div className="text-left text-lg font-bold sm:text-right">
          {t('field.totalAmount')}: ₩{includedTotal.toLocaleString()}
        </div>

        {/* Per-payee grouped summary */}
        {Object.entries(groupedByPayee).map(([key, reqs]) => {
          const first = reqs[0]
          const subtotal = reqs.reduce((sum, r) => sum + r.totalAmount, 0)
          return (
            <div key={key} className="border-t border-[#D8DDE5] pt-4">
              <div className="flex flex-col gap-1 mb-2 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-sm font-medium text-[#001F43]">
                  {first.payee}
                  {!first.isCorporateCard && (
                    <span className="ml-2 text-xs text-gray-400">
                      {first.bankName} {first.bankAccount}
                    </span>
                  )}
                </h3>
                <span className="text-sm font-semibold">₩{subtotal.toLocaleString()}</span>
              </div>
              <ul className="text-sm text-[#667085] space-y-0.5 pl-2">
                {reqs.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      {r.date} — {t('form.itemCount', { count: r.items.length })}
                    </span>
                    <span className="shrink-0">₩{r.totalAmount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onBack}
          className="finance-secondary-button px-4 py-2 text-sm rounded transition-colors"
        >
          {t('settlement.backToSelect')}
        </button>
        <button
          onClick={onSettle}
          disabled={reviewedCount === 0 || processing}
          className="flex-1 finance-primary-button px-4 py-2 rounded text-sm font-semibold disabled:bg-gray-400"
        >
          {processing ? t('settlement.processing') : t('settlement.finalSettle')}
        </button>
      </div>

      <ProcessingOverlay open={processing} text={t('common.processingMessage')} />
    </div>
  )
}
