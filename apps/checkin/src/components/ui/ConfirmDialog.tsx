import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  confirmationPhrase?: string // If set, user must type this phrase to confirm
  isLoading?: boolean
}

const variantStyles = {
  danger: {
    icon: 'text-[#FA383E]',
    iconBg: 'bg-[#FFEBEE]',
    button: 'bg-[#FA383E] hover:bg-[#E53935]'
  },
  warning: {
    icon: 'text-[#F57C00]',
    iconBg: 'bg-[#FFF3E0]',
    button: 'bg-[#F57C00] hover:bg-[#EF6C00]'
  },
  info: {
    icon: 'text-[#1877F2]',
    iconBg: 'bg-[#E7F3FF]',
    button: 'bg-[#1877F2] hover:bg-[#166FE5]'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 border border-[#DADDE1]">
        <div className="p-6">
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
                  <input
                    type="text"
                    value={inputPhrase}
                    onChange={(e) => setInputPhrase(e.target.value)}
                    placeholder={confirmationPhrase}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#FA383E] focus:border-transparent disabled:bg-[#F0F2F5] disabled:text-[#65676B]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-[#F7F8FA] border-t border-[#DADDE1] rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-[#050505] bg-white border border-[#DADDE1] rounded-lg font-semibold hover:bg-[#F0F2F5] transition-colors disabled:opacity-50"
          >
            {cancelText || t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled || loading}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              confirmText || t('common.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
