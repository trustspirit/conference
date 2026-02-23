import { useTranslation } from 'react-i18next'
import type { BudgetUsage } from '../hooks/useBudgetUsage'

interface Props {
  budgetUsage: BudgetUsage | null
  className?: string
}

export default function BudgetWarningBanner({ budgetUsage, className = '' }: Props) {
  const { t } = useTranslation()

  if (!budgetUsage?.warning) return null

  return (
    <div className={`rounded-lg p-3 border text-sm ${budgetUsage.exceeded ? 'bg-red-50 border-red-300 text-red-700' : 'bg-orange-50 border-orange-300 text-orange-700'} ${className}`}>
      {budgetUsage.exceeded
        ? t('budget.exceeded', { percent: budgetUsage.percent })
        : t('budget.warning', { percent: budgetUsage.percent, threshold: budgetUsage.warningThreshold })}
    </div>
  )
}
