import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button, Checkbox, TextField } from 'trust-ui-react'
import SignaturePad from './SignaturePad'
import BudgetWarningBanner from './BudgetWarningBanner'

interface ApprovalModalProps {
  open: boolean
  onClose: () => void
  request: { payee: string; bankName: string; bankAccount: string } | null
  bankBookUrl: string | undefined
  budgetUsage: React.ComponentProps<typeof BudgetWarningBanner>['budgetUsage']
  savedSignature: string | undefined
  onConfirm: (signature: string) => void
  isPending: boolean
}

export function ApprovalModal({
  open, onClose, request, bankBookUrl, budgetUsage,
  savedSignature, onConfirm, isPending,
}: ApprovalModalProps) {
  const { t } = useTranslation()
  const [signatureData, setSignatureData] = useState(savedSignature || '')

  return (
    <Dialog
      open={open}
      onClose={() => { if (!isPending) onClose() }}
      size="md"
    >
      <Dialog.Title onClose={() => { if (!isPending) onClose() }} showClose>{t('approval.signTitle')}</Dialog.Title>
      <Dialog.Content>
        {request && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">
              {t('field.payee')}: {request.payee}
            </p>
            <p className="text-xs text-gray-500 mb-2">
              {t('field.bankAndAccount')}: {request.bankName} {request.bankAccount}
            </p>
            {bankBookUrl ? (
              <a href={bankBookUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={bankBookUrl}
                  alt={t('field.bankBook')}
                  className="max-h-32 rounded border border-gray-200 object-contain bg-white"
                />
              </a>
            ) : (
              <p className="text-xs text-gray-400">{t('settings.bankBookRequiredHint')}</p>
            )}
          </div>
        )}

        <BudgetWarningBanner budgetUsage={budgetUsage} className="mb-4" />

        <p className="text-sm text-gray-500 mb-4">{t('approval.signDescription')}</p>

        {savedSignature && (
          <div className="mb-3">
            <Checkbox
              checked={signatureData === savedSignature}
              onChange={(e) => setSignatureData(e.target.checked ? savedSignature : '')}
              label={t('approval.useSavedSignature')}
            />
            {signatureData === savedSignature && (
              <div className="mt-2 border border-gray-200 rounded p-2 bg-gray-50">
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
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm(signatureData)}
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
      onClose={() => { if (!isPending) onClose() }}
      size="md"
    >
      <Dialog.Title onClose={() => { if (!isPending) onClose() }} showClose>{t('approval.rejectTitle')}</Dialog.Title>
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
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
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

export function ForceRejectionModal({ open, onClose, onConfirm, isPending }: ForceRejectionModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onClose={() => { if (!isPending) onClose() }}
      size="md"
    >
      <Dialog.Title onClose={() => { if (!isPending) onClose() }} showClose>{t('approval.forceRejectTitle')}</Dialog.Title>
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
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
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
