import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  text?: string
}

export default function ProcessingOverlay({ open, text }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
      <div className="finance-panel rounded-xl px-8 py-6 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#002C5F] rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-700">{text ?? t('common.processingMessage')}</p>
      </div>
    </div>
  )
}
