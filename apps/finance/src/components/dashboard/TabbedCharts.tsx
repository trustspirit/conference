import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MonthlyTrendChart from './MonthlyTrendChart'
import CommitteeBarChart from './CommitteeBarChart'
import BudgetCodeBarChart from './BudgetCodeBarChart'

type ChartTab = 'monthly' | 'committee' | 'budgetCode'

export default function TabbedCharts({
  byCommittee,
  byBudgetCode,
  budgetByCode,
  hasBudget,
  monthlyTrend,
  monthlyCount,
  dailyTrend,
  dailyCount
}: {
  byCommittee: Record<string, { count: number; amount: number; approvedAmount: number }>
  byBudgetCode: Record<number, { count: number; amount: number; approvedAmount: number }>
  budgetByCode: Record<number, number>
  hasBudget: boolean
  monthlyTrend?: Record<string, number>
  monthlyCount?: Record<string, number>
  dailyTrend?: Record<string, number>
  dailyCount?: Record<string, number>
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ChartTab>('monthly')

  const tabs: { key: ChartTab; label: string }[] = [
    { key: 'monthly', label: t('dashboard.requestTrend') },
    { key: 'committee', label: t('dashboard.byCommittee') },
    { key: 'budgetCode', label: t('dashboard.byBudgetCode') }
  ]

  return (
    <div className="finance-panel rounded-lg mb-6">
      <div className="border-b border-finance-border px-4 flex gap-1 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === item.key
                ? 'border-finance-primary text-finance-primary font-semibold'
                : 'border-transparent text-finance-muted hover:text-finance-primary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'monthly' && (
          <MonthlyTrendChart
            monthlyTrend={monthlyTrend}
            monthlyCount={monthlyCount}
            dailyTrend={dailyTrend}
            dailyCount={dailyCount}
          />
        )}
        {tab === 'committee' && <CommitteeBarChart byCommittee={byCommittee} />}
        {tab === 'budgetCode' && (
          <BudgetCodeBarChart
            byBudgetCode={byBudgetCode}
            budgetByCode={budgetByCode}
            hasBudget={hasBudget}
          />
        )}
      </div>
    </div>
  )
}
