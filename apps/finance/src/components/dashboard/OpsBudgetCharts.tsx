import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { computeCategoryTotals, paletteColor } from './opsBudgetSelectors'
import type { OpsBudgetCategory, OpsBudgetInclusion } from '../../types'

type ChartTab = 'usage' | 'composition'

interface Props {
  categories: OpsBudgetCategory[]
  inclusions: OpsBudgetInclusion[]
}

export default function OpsBudgetCharts({ categories, inclusions }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ChartTab>('usage')

  const totals = useMemo(
    () => computeCategoryTotals(categories, inclusions),
    [categories, inclusions]
  )

  const barData = categories.map((c) => {
    const tt = totals.byCategory[c.id]
    return {
      name: c.name,
      included: tt.includedKrw,
      remaining: Math.max(0, tt.remainingKrw),
      overflow: tt.remainingKrw < 0 ? -tt.remainingKrw : 0,
      color: c.color ?? paletteColor(c.sortIndex),
    }
  })

  const pieData = categories
    .map((c) => ({
      name: c.name,
      value: totals.byCategory[c.id].includedKrw,
      color: c.color ?? paletteColor(c.sortIndex),
    }))
    .filter((d) => d.value > 0)

  if (categories.length === 0) {
    return (
      <div className="finance-panel rounded-lg p-6 mt-6 text-center text-finance-muted">
        {t('dashboard.opsBudget.chartsEmpty')}
      </div>
    )
  }

  const tabs: { key: ChartTab; label: string }[] = [
    { key: 'usage',       label: t('dashboard.opsBudget.chartsTabUsage') },
    { key: 'composition', label: t('dashboard.opsBudget.chartsTabComposition') },
  ]

  return (
    <div className="finance-panel rounded-lg mt-6">
      {/* Mini-tab strip */}
      <div role="tablist" aria-label={t('dashboard.opsBudget.chartsTabsAriaLabel')} className="border-b border-finance-border px-4 flex gap-1 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
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
        {/* Usage bar chart */}
        {tab === 'usage' && (
          <div
            role="img"
            aria-label={t('dashboard.opsBudget.usageChartAriaLabel', { count: barData.length })}
          >
            <h4 className="text-sm font-semibold text-finance-primary mb-3">
              {t('dashboard.opsBudget.usageChartTitle')}
            </h4>
            <div style={{ height: Math.max(180, barData.length * 36) }}>
              <ResponsiveContainer>
                <BarChart data={barData} layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 8, left: 80 }}>
                  <XAxis type="number" tickFormatter={(v) => `₩${(v / 1000).toLocaleString()}k`} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(v) => `₩${(Number(v) || 0).toLocaleString('en-US')}`} />
                  <Legend />
                  <Bar dataKey="included"  stackId="b" name={t('dashboard.opsBudget.included')}  fill="#4f46e5" />
                  <Bar dataKey="remaining" stackId="b" name={t('dashboard.opsBudget.remaining')} fill="#e5e7eb" />
                  <Bar dataKey="overflow"  stackId="b" name={t('dashboard.opsBudget.overflow')}  fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>{t('dashboard.opsBudget.usageChartTitle')}</caption>
              <thead>
                <tr>
                  <th>{t('dashboard.opsBudget.colName')}</th>
                  <th>{t('dashboard.opsBudget.included')}</th>
                  <th>{t('dashboard.opsBudget.remaining')}</th>
                </tr>
              </thead>
              <tbody>
                {barData.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td>₩{d.included.toLocaleString('en-US')}</td>
                    <td>₩{d.remaining.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Composition donut chart */}
        {tab === 'composition' && (
          <div
            role="img"
            aria-label={t('dashboard.opsBudget.compositionChartAriaLabel')}
          >
            <h4 className="text-sm font-semibold text-finance-primary mb-3">
              {t('dashboard.opsBudget.compositionTitle')}
            </h4>
            {pieData.length === 0
              ? <p className="text-sm text-finance-muted py-12 text-center">
                  {t('dashboard.opsBudget.noIncludedYet')}
                </p>
              : (
                <>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name"
                             outerRadius={90} innerRadius={50} paddingAngle={1}>
                          {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => `₩${(Number(v) || 0).toLocaleString('en-US')}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="sr-only">
                    <caption>{t('dashboard.opsBudget.compositionTitle')}</caption>
                    <thead>
                      <tr>
                        <th>{t('dashboard.opsBudget.colName')}</th>
                        <th>{t('dashboard.opsBudget.included')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieData.map((d) => (
                        <tr key={d.name}>
                          <td>{d.name}</td>
                          <td>₩{d.value.toLocaleString('en-US')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
