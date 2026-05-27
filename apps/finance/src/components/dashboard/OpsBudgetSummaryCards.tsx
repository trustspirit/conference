import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import StatCard from '../StatCard'
import { computeCategoryTotals } from './opsBudgetSelectors'
import type { OpsBudgetCategory, OpsBudgetInclusion } from '../../types'

interface Props {
  categories: OpsBudgetCategory[]
  inclusions: OpsBudgetInclusion[]
  unassignedCount: number
  usdToKrwRate: number
  onJumpToPicker?: (() => void) | undefined
}

export default function OpsBudgetSummaryCards({
  categories, inclusions, unassignedCount, usdToKrwRate, onJumpToPicker,
}: Props) {
  const { t } = useTranslation()
  const totals = useMemo(
    () => computeCategoryTotals(categories, inclusions, usdToKrwRate),
    [categories, inclusions, usdToKrwRate]
  )
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <StatCard
        label={t('dashboard.opsBudget.totalAllocated')}
        value={`₩${totals.grandAllocatedKrw.toLocaleString('en-US')}`}
      />
      <StatCard
        label={t('dashboard.opsBudget.totalIncluded')}
        value={`₩${totals.grandTotalKrw.toLocaleString('en-US')}`}
        sub={totals.grandTotalUsd > 0 ? `$${totals.grandTotalUsd.toLocaleString('en-US')}` : undefined}
      />
      <StatCard
        label={t('dashboard.opsBudget.totalRemaining')}
        value={`₩${totals.grandRemainingKrw.toLocaleString('en-US')}`}
        color={totals.grandRemainingKrw < 0 ? 'red' : undefined}
      />
      <button
        onClick={onJumpToPicker}
        className="text-left finance-panel rounded-lg p-4 hover:bg-finance-primary-subtle transition"
      >
        <p className="text-xs text-finance-muted">{t('dashboard.opsBudget.unassignedItems')}</p>
        <p className="text-lg font-bold text-finance-text">{unassignedCount}</p>
        <p className="text-xs text-finance-primary mt-1">{t('dashboard.opsBudget.viewPicker')} →</p>
      </button>
    </div>
  )
}
