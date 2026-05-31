import { useTranslation } from 'react-i18next'

/** Shared page size for the three dashboard list panels (overall budget item
 *  list, ops-budget item picker, ops-budget included list). Kept in lockstep
 *  so the three panels paginate at the same cadence. */
export const DASHBOARD_PAGE_SIZE = 15

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
