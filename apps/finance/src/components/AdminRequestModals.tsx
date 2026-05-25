import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button, Checkbox, TextField } from 'trust-ui-react'
import SignaturePad from './SignaturePad'
import BudgetWarningBanner from './BudgetWarningBanner'
import BankBookPreview from './BankBookPreview'

interface ApprovalModalProps {
  open: boolean
  onClose: () => void
  request: {
    payee: string
    bankName: string
    bankAccount: string
    isCorporateCard?: boolean
  } | null
  bankBookUrl: string | undefined
  budgetUsage: React.ComponentProps<typeof BudgetWarningBanner>['budgetUsage']
  savedSignature: string | undefined
  onConfirm: (signature: string) => void
  onSignatureSync?: (signature: string) => void
  isPending: boolean
}

export function ApprovalModal({
  open,
  onClose,
  request,
  bankBookUrl,
  budgetUsage,
  savedSignature,
  onConfirm,
  onSignatureSync,
  isPending
}: ApprovalModalProps) {
  const { t } = useTranslation()
  const [signatureData, setSignatureData] = useState(savedSignature || '')

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose()
      }}
      size="md"
    >
      <Dialog.Title
        onClose={() => {
          if (!isPending) onClose()
        }}
        showClose
      >
        {t('approval.signTitle')}
      </Dialog.Title>
      <Dialog.Content>
        {request && (
          <div className="mb-4 p-3 bg-finance-surface border border-finance-border rounded-lg">
            <p className="text-xs font-medium text-finance-muted mb-1">
              {t('field.payee')}: {request.payee}
            </p>
            {!request.isCorporateCard && (
              <p className="text-xs text-finance-muted mb-2">
                {t('field.bankAndAccount')}: {request.bankName} {request.bankAccount}
              </p>
            )}
            {!request.isCorporateCard &&
              (bankBookUrl ? (
                <a href={bankBookUrl} target="_blank" rel="noopener noreferrer">
                  <BankBookPreview
                    url={bankBookUrl}
                    alt={t('field.bankBook')}
                    className="object-contain rounded border border-finance-border bg-white"
                  />
                </a>
              ) : (
                <p className="text-xs text-gray-400">{t('settings.bankBookRequiredHint')}</p>
              ))}
          </div>
        )}

        <BudgetWarningBanner budgetUsage={budgetUsage} className="mb-4" />

        <p className="text-sm text-finance-muted mb-4">{t('approval.signDescription')}</p>

        {savedSignature && (
          <div className="mb-3">
            <Checkbox
              checked={signatureData === savedSignature}
              onChange={(e) => setSignatureData(e.target.checked ? savedSignature : '')}
              label={t('approval.useSavedSignature')}
            />
            {signatureData === savedSignature && (
              <div className="mt-2 border border-finance-border rounded p-2 bg-finance-surface">
                <img src={savedSignature} alt="Saved signature" className="max-h-24 mx-auto" />
              </div>
            )}
          </div>
        )}

        {signatureData !== savedSignature && (
          <SignaturePad
            initialData={signatureData !== savedSignature ? signatureData : ''}
            onChange={setSignatureData}
          />
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          className="finance-primary-button"
          onClick={() => {
            if (signatureData && signatureData !== savedSignature && onSignatureSync) {
              onSignatureSync(signatureData)
            }
            onConfirm(signatureData)
          }}
          disabled={!signatureData || isPending}
          loading={isPending}
        >
          {isPending ? t('common.submitting') : t('approval.signAndApprove')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

interface RejectionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
}

export function RejectionModal({ open, onClose, onConfirm, isPending }: RejectionModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose()
      }}
      size="md"
    >
      <Dialog.Title
        onClose={() => {
          if (!isPending) onClose()
        }}
        showClose
      >
        {t('approval.rejectTitle')}
      </Dialog.Title>
      <Dialog.Content>
        <p className="text-sm text-gray-500 mb-4">{t('approval.rejectDescription')}</p>
        <TextField
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          rows={4}
          placeholder={t('approval.rejectPlaceholder')}
          fullWidth
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(reason)}
          disabled={!reason.trim() || isPending}
          loading={isPending}
        >
          {isPending ? t('common.submitting') : t('approval.reject')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

interface ForceRejectionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
}

export function ForceRejectionModal({
  open,
  onClose,
  onConfirm,
  isPending
}: ForceRejectionModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose()
      }}
      size="md"
    >
      <Dialog.Title
        onClose={() => {
          if (!isPending) onClose()
        }}
        showClose
      >
        {t('approval.forceRejectTitle')}
      </Dialog.Title>
      <Dialog.Content>
        <p className="text-sm text-gray-500 mb-4">{t('approval.forceRejectDescription')}</p>
        <TextField
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          rows={4}
          placeholder={t('approval.forceRejectPlaceholder')}
          fullWidth
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(reason)}
          disabled={!reason.trim() || isPending}
          loading={isPending}
        >
          {isPending ? t('common.submitting') : t('approval.forceReject')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

interface RollbackConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  payee: string
}

export function RollbackConfirmModal({
  open,
  onClose,
  onConfirm,
  isPending,
  payee
}: RollbackConfirmModalProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose()
      }}
      size="md"
    >
      <Dialog.Title
        onClose={() => {
          if (!isPending) onClose()
        }}
        showClose
      >
        {t('admin.rollbackTitle')}
      </Dialog.Title>
      <Dialog.Content>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            ⚠️
          </span>
          <div className="space-y-2">
            <p className="text-sm text-finance-muted">{t('admin.rollbackWarning', { payee })}</p>
            <p className="text-sm text-finance-muted">{t('admin.rollbackFieldsCleared')}</p>
          </div>
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending} loading={isPending}>
          {isPending ? t('common.submitting') : t('admin.rollbackConfirm')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  payee: string
  receiptCount: number
  routeMapCount: number
  resubmissionCount: number
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  isPending,
  payee,
  receiptCount,
  routeMapCount,
  resubmissionCount
}: DeleteConfirmModalProps) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose()
      }}
      size="md"
    >
      <Dialog.Title
        onClose={() => {
          if (!isPending) onClose()
        }}
        showClose
      >
        {t('admin.deleteTitle')}
      </Dialog.Title>
      <Dialog.Content>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            ⚠️
          </span>
          <div className="space-y-2">
            <p className="text-sm text-finance-muted">{t('admin.deleteWarning', { payee })}</p>
            <ul className="list-disc pl-5 text-sm text-finance-muted space-y-1">
              <li>{t('admin.deleteReceiptCount', { count: receiptCount })}</li>
              <li>{t('admin.deleteRouteMapCount', { count: routeMapCount })}</li>
              <li>{t('admin.deleteResubmissionCount', { count: resubmissionCount })}</li>
            </ul>
            <p className="text-sm text-red-600 font-medium">{t('admin.deleteIrreversible')}</p>
          </div>
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending} loading={isPending}>
          {isPending ? t('common.submitting') : t('admin.deleteConfirm')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}
