import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Button, TextField } from 'trust-ui-react'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'primary'
  confirmationPhrase?: string
  isLoading?: boolean
}

const variantToButtonVariant: Record<string, 'danger' | 'primary'> = {
  danger: 'danger',
  warning: 'primary',
  info: 'primary',
  primary: 'primary'
}

const variantStyles = {
  danger: {
    icon: 'text-[#FA383E]',
    iconBg: 'bg-[#FFEBEE]'
  },
  warning: {
    icon: 'text-[#F57C00]',
    iconBg: 'bg-[#FFF3E0]'
  },
  info: {
    icon: 'text-[#1877F2]',
    iconBg: 'bg-[#E7F3FF]'
  },
  primary: {
    icon: 'text-[#1877F2]',
    iconBg: 'bg-[#E7F3FF]'
  }
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'danger',
  confirmationPhrase,
  isLoading = false
}: ConfirmDialogProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [inputPhrase, setInputPhrase] = useState('')
  const [internalLoading, setInternalLoading] = useState(false)

  const styles = variantStyles[variant]
  const isConfirmDisabled = confirmationPhrase ? inputPhrase !== confirmationPhrase : false
  const loading = isLoading || internalLoading

  const handleConfirm = async () => {
    setInternalLoading(true)
    try {
      await onConfirm()
      setInputPhrase('')
      onClose()
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setInternalLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setInputPhrase('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={handleClose} size="md">
      <Dialog.Content>
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}
          >
            {variant === 'danger' ? (
              <svg
                className={`w-6 h-6 ${styles.icon}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : variant === 'warning' ? (
              <svg
                className={`w-6 h-6 ${styles.icon}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className={`w-6 h-6 ${styles.icon}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[#050505]">{title}</h3>
            <p className="mt-2 text-sm text-[#65676B] whitespace-pre-wrap">{description}</p>

            {confirmationPhrase && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#65676B] mb-2">
                  {t('settings.typeToConfirm', { phrase: confirmationPhrase })}
                </label>
                <TextField
                  value={inputPhrase}
                  onChange={(e) => setInputPhrase(e.target.value)}
                  placeholder={confirmationPhrase}
                  disabled={loading}
                  fullWidth
                />
              </div>
            )}
          </div>
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={loading}
          fullWidth
        >
          {cancelText || t('common.cancel')}
        </Button>
        <Button
          variant={variantToButtonVariant[variant]}
          onClick={handleConfirm}
          disabled={isConfirmDisabled || loading}
          loading={loading}
          fullWidth
        >
          {confirmText || t('common.confirm')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

export default ConfirmDialog
