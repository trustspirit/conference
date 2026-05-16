import { useTranslation } from 'react-i18next'
import { PaymentRequest, AppUser } from '../../types'
import InfoGrid from '../InfoGrid'
import ItemsTable from '../ItemsTable'
import ReceiptGallery from '../ReceiptGallery'
import BankBookPreview from '../BankBookPreview'
import { ForceRejectionModal } from '../AdminRequestModals'
import ReviewChecklist from '../ReviewChecklist'
import { SETTLEMENT_CHECKLIST } from '../../constants/reviewChecklist'

interface Props {
  request: PaymentRequest
  requester: AppUser | null | undefined
  reviewIndex: number
  total: number
  rejectingRequestId: string | null
  forceRejectPending: boolean
  onInclude: () => void
  onReject: (id: string) => void
  onRejectConfirm: (reason: string) => void
  onRejectClose: () => void
  onBack: () => void
}

export default function SettlementReviewStep({
  request: req,
  requester,
  reviewIndex,
  total,
  rejectingRequestId,
  forceRejectPending,
  onInclude,
  onReject,
  onRejectConfirm,
  onRejectClose,
  onBack
}: Props) {
  const { t } = useTranslation()
  const bankBookUrl = req.isVendorRequest
    ? req.vendorBankBookUrl
    : requester?.bankBookUrl || requester?.bankBookDriveUrl

  return (
    <>
      {/* Mobile: collapsible checklist banner */}
      <div className="sm:hidden mb-4 max-w-3xl mx-auto">
        <ReviewChecklist
          items={SETTLEMENT_CHECKLIST}
          stage="settlement"
          excludeKeys={req.isCorporateCard ? ['bankBookNameMatches', 'bankBookCorrect'] : undefined}
        />
      </div>

      <div className="flex gap-6 justify-center">
        <div className="flex-1 min-w-0 max-w-3xl">
          {/* Progress header */}
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={onBack} className="text-sm text-[#667085] hover:text-[#002C5F]">
              {t('settlement.backToSelect')}
            </button>
            <span className="text-sm font-medium text-[#667085]">
              {t('settlement.reviewProgress', { current: reviewIndex + 1, total })}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#EEF1F5] rounded-full h-1.5 mb-6">
            <div
              className="finance-primary-button h-1.5 rounded-full transition-all"
              style={{ width: `${((reviewIndex + 1) / total) * 100}%` }}
            />
          </div>

          {/* Request detail card */}
          <div className="finance-panel rounded-lg p-4 mb-6 sm:p-6">
            <h3 className="text-lg font-bold text-[#002C5F] mb-4">{req.payee}</h3>

            <InfoGrid
              className="mb-6"
              items={[
                { label: t('field.payee'), value: req.payee },
                { label: t('field.date'), value: req.date },
                { label: t('field.phone'), value: req.phone },
                { label: t('field.session'), value: req.session },
                ...(!req.isCorporateCard
                  ? [
                      {
                        label: t('field.bankAndAccount'),
                        value: `${req.bankName} ${req.bankAccount}`
                      }
                    ]
                  : []),
                {
                  label: t('field.committee'),
                  value:
                    req.committee === 'operations'
                      ? t('committee.operations')
                      : t('committee.preparation')
                }
              ]}
            />

            <ItemsTable items={req.items} totalAmount={req.totalAmount} />

            <ReceiptGallery receipts={req.receipts} />

            {/* Bank Book */}
            {bankBookUrl && !req.isCorporateCard && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#002C5F] mb-3">{t('field.bankBook')}</h3>
                <div className="border border-[#D8DDE5] rounded-lg overflow-hidden inline-block">
                  <a href={bankBookUrl} target="_blank" rel="noopener noreferrer">
                    <BankBookPreview
                      url={bankBookUrl}
                      alt={t('field.bankBook')}
                      maxHeight="max-h-48"
                      className="object-contain bg-[#F8FAFC]"
                    />
                  </a>
                  <div className="px-3 py-2 bg-[#F8FAFC] border-t border-[#D8DDE5]">
                    <a
                      href={bankBookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#002C5F] hover:underline"
                    >
                      {t('settings.bankBookViewDrive')}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Meta info */}
            <InfoGrid
              className="border-t border-[#D8DDE5] pt-4"
              items={[
                {
                  label: t('field.requestedBy'),
                  value: `${req.requestedBy.name} (${req.requestedBy.email})`
                },
                ...(req.reviewedBy
                  ? [
                      {
                        label: t('approval.reviewedBy'),
                        value: `${req.reviewedBy.name} (${req.reviewedBy.email})`
                      }
                    ]
                  : []),
                {
                  label: t('field.approvedBy'),
                  value: req.approvedBy ? `${req.approvedBy.name} (${req.approvedBy.email})` : '-'
                }
              ]}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onReject(req.id)}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700"
            >
              {t('approval.reject')}
            </button>
            <button
              onClick={onInclude}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
            >
              {t('settlement.confirmInclude')}
            </button>
          </div>
        </div>

        {/* Desktop: sticky sidebar checklist */}
        <div className="hidden sm:block shrink-0">
          <ReviewChecklist
            items={SETTLEMENT_CHECKLIST}
            stage="settlement"
            excludeKeys={
              req.isCorporateCard ? ['bankBookNameMatches', 'bankBookCorrect'] : undefined
            }
          />
        </div>
      </div>

      <ForceRejectionModal
        key={rejectingRequestId ?? ''}
        open={!!rejectingRequestId}
        onClose={onRejectClose}
        onConfirm={onRejectConfirm}
        isPending={forceRejectPending}
      />
    </>
  )
}
