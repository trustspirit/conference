import { useTranslation } from 'react-i18next'

/** Page size for the overall-budget item list (overview tab). */
export const DASHBOARD_PAGE_SIZE = 15

/** Page size for the ops-budget panels (item picker, included list). */
export const OPS_BUDGET_PAGE_SIZE = 10

interface LoadMoreButtonProps {
  remaining: number
  onClick: () => void
}

export function LoadMoreButton({ remaining, onClick }: LoadMoreButtonProps) {
  const { t } = useTranslation()
  return (
    <div className="pt-3 flex justify-center">
      <button
        onClick={onClick}
        className="text-sm px-3 py-1.5 rounded border border-finance-border-soft hover:bg-finance-surface"
      >
        {t('common.loadMore')} ({remaining})
      </button>
    </div>
  )
}
