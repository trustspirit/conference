import { useTranslation } from 'react-i18next'

export default function Spinner({ text }: { text?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <span className="text-sm text-gray-500">{text || t('common.loading', 'Loading...')}</span>
    </div>
  )
}
