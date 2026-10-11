import { useTranslation } from 'react-i18next'

export default function ProjectClosedNotice({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className={`rounded-lg border border-finance-border bg-finance-primary-surface px-4 py-3 text-sm text-finance-text-secondary ${className}`}
    >
      <p className="font-medium text-finance-primary">{t('project.closedTitle')}</p>
      <p className="mt-0.5">{t('project.closedDescription')}</p>
    </div>
  )
}
