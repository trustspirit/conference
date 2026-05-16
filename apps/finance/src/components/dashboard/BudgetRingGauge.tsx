import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

interface Props {
  totalBudget: number
  approvedAmount: number
  pendingAmount: number
  requests?: { date: string; totalAmount: number; status: string }[]
}

export default function BudgetRingGauge({
  totalBudget,
  approvedAmount,
  pendingAmount,
  requests = []
}: Props) {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState<'bar' | 'chart'>('bar')

  const remaining = Math.max(0, totalBudget - approvedAmount - pendingAmount)
  const usagePercent = totalBudget > 0 ? Math.round((approvedAmount / totalBudget) * 100) : 0
  const pendingPercent = totalBudget > 0 ? Math.round((pendingAmount / totalBudget) * 100) : 0
  const combinedPercent = Math.min(usagePercent + pendingPercent, 100)
  const overBudget = approvedAmount + pendingAmount > totalBudget

  if (totalBudget === 0) {
    return (
      <div className="finance-panel rounded-lg p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-finance-primary mb-4">
          {t('dashboard.budgetOverview')}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-finance-muted">{t('dashboard.totalBudget')}</p>
            <p className="text-lg font-bold text-gray-400">{t('dashboard.notSet')}</p>
          </div>
          <div>
            <p className="text-xs text-finance-muted">{t('dashboard.used')}</p>
            <p className="text-lg font-bold text-finance-primary">
              {'\u20A9'}
              {approvedAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-finance-muted">{t('dashboard.pendingAmount')}</p>
            <p className="text-lg font-bold text-finance-neutral">
              {'\u20A9'}
              {pendingAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const breakdown = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${overBudget ? 'bg-finance-danger' : 'bg-finance-primary'}`}
        />
        <div>
          <p className="text-xs text-finance-muted">{t('dashboard.used')}</p>
          <p
            className={`text-sm font-bold ${overBudget ? 'text-finance-danger' : 'text-finance-primary'}`}
          >
            {'\u20A9'}
            {approvedAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">{usagePercent}%</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-finance-neutral shrink-0" />
        <div>
          <p className="text-xs text-finance-muted">{t('dashboard.pendingAmount')}</p>
          <p className="text-sm font-bold text-finance-body">
            {'\u20A9'}
            {pendingAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">{pendingPercent}%</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0" />
        <div>
          <p className="text-xs text-finance-muted">{t('dashboard.remaining')}</p>
          <p
            className={`text-sm font-bold ${remaining <= 0 ? 'text-finance-danger' : 'text-finance-accent'}`}
          >
            {'\u20A9'}
            {(totalBudget - approvedAmount).toLocaleString()}
          </p>
          {remaining > 0 && (
            <p className="text-xs text-gray-400">{100 - usagePercent - pendingPercent}%</p>
          )}
        </div>
      </div>
    </div>
  )

  const formatAxis = (v: number) => {
    const isKo = i18n.language === 'ko'
    if (v >= 100000000)
      return `${(v / 100000000).toFixed(v % 100000000 === 0 ? 0 : 1)}${isKo ? '억' : 'B'}`
    if (v >= 10000) return `${(v / 10000).toFixed(0)}${isKo ? '만' : 'k'}`
    return v.toLocaleString()
  }

  return (
    <div className="finance-panel rounded-lg p-4 sm:p-6">
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-finance-primary">
          {t('dashboard.budgetOverview')}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-finance-muted">
            {t('dashboard.totalBudget')}{' '}
            <span className="font-bold text-gray-900">
              {'\u20A9'}
              {totalBudget.toLocaleString()}
            </span>
          </span>
          <div className="flex border border-finance-border rounded overflow-hidden">
            <button
              onClick={() => setView('bar')}
              className={`px-2 py-1 ${view === 'bar' ? 'bg-finance-primary-surface text-finance-primary' : 'text-finance-muted hover:text-finance-primary'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="8" width="4" height="7" rx="0.5" />
                <rect x="6" y="4" width="4" height="11" rx="0.5" />
                <rect x="11" y="1" width="4" height="14" rx="0.5" />
              </svg>
            </button>
            <button
              onClick={() => setView('chart')}
              className={`px-2 py-1 ${view === 'chart' ? 'bg-finance-primary-surface text-finance-primary' : 'text-finance-muted hover:text-finance-primary'}`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 12L5 6L9 8L14 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {view === 'bar' ? (
        <>
          <div className="mb-4">
            <div className="w-full h-5 bg-finance-muted-surface rounded-full overflow-hidden flex">
              {usagePercent > 0 && (
                <div
                  className={`h-full transition-all ${overBudget ? 'bg-finance-danger' : 'bg-finance-primary'}`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              )}
              {pendingPercent > 0 && (
                <div
                  className="h-full bg-finance-neutral transition-all"
                  style={{
                    width: `${Math.min(pendingPercent, 100 - Math.min(usagePercent, 100))}%`
                  }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span
                className={`text-xs font-medium ${overBudget ? 'text-finance-danger' : 'text-finance-primary'}`}
              >
                {combinedPercent}%
              </span>
              <span className="text-xs text-gray-400">100%</span>
            </div>
          </div>
          {breakdown}
        </>
      ) : (
        <>
          <BudgetTimeChart
            totalBudget={totalBudget}
            requests={requests}
            formatAxis={formatAxis}
            usagePercent={usagePercent}
          />
          <div className="mt-3">{breakdown}</div>
        </>
      )}
    </div>
  )
}

function BudgetTimeChart({
  totalBudget,
  requests,
  formatAxis,
  usagePercent
}: {
  totalBudget: number
  requests: { date: string; totalAmount: number; status: string }[]
  formatAxis: (v: number) => string
  usagePercent: number
}) {
  const { t } = useTranslation()

  const chartData = useMemo(() => {
    // Group requests by date, compute cumulative used and pending
    const byDate: Record<string, { used: number; pending: number }> = {}

    const sorted = [...requests]
      .filter((r) => r.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))

    for (const r of sorted) {
      if (!byDate[r.date]) byDate[r.date] = { used: 0, pending: 0 }
      if (r.status === 'approved' || r.status === 'settled') {
        byDate[r.date].used += r.totalAmount
      } else if (r.status === 'pending') {
        byDate[r.date].pending += r.totalAmount
      }
    }

    const dates = Object.keys(byDate).sort()
    if (dates.length === 0) return []

    const result: { date: string; label: string; used: number; combined: number }[] = []

    // Start point at origin
    const firstDate = dates[0]
    result.push({ date: firstDate, label: '0', used: 0, combined: 0 })

    let cumUsed = 0
    let cumPending = 0
    dates.forEach((date) => {
      cumUsed += byDate[date].used
      cumPending += byDate[date].pending
      result.push({
        date,
        label: date.slice(5), // MM-DD
        used: cumUsed,
        combined: cumUsed + cumPending
      })
    })

    return result
  }, [requests])

  const lastPoint = chartData[chartData.length - 1]
  const maxData = Math.max(lastPoint?.combined ?? 0, lastPoint?.used ?? 0)
  const isZoomedIn = maxData > 0 && maxData < totalBudget * 0.2

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-finance-muted text-sm">
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div>
      {isZoomedIn && (
        <p className="text-xs text-finance-muted mb-1 text-right">
          {t('dashboard.totalBudget')} {'\u20A9'}
          {totalBudget.toLocaleString()} ({t('dashboard.usage', { percent: usagePercent })})
        </p>
      )}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="budgetUsedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--finance-primary)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--finance-primary)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="budgetCombinedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--finance-neutral)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--finance-neutral)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--finance-neutral-subtle)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              domain={(() => {
                const lastPoint = chartData[chartData.length - 1]
                const maxData = Math.max(lastPoint?.combined ?? 0, lastPoint?.used ?? 0)
                // If data is less than 20% of budget, zoom in to show detail
                if (maxData > 0 && maxData < totalBudget * 0.2) {
                  return [0, Math.ceil(maxData * 3)]
                }
                return [0, Math.ceil(totalBudget * 1.15)]
              })()}
              ticks={(() => {
                const lastPoint = chartData[chartData.length - 1]
                const used = lastPoint?.used ?? 0
                const combined = lastPoint?.combined ?? 0
                const maxData = Math.max(combined, used)
                const values = new Set([0])
                // Only add totalBudget tick if it fits in the visible range
                if (maxData >= totalBudget * 0.2) values.add(totalBudget)
                if (used > 0) values.add(used)
                if (combined > 0 && combined !== used) values.add(combined)
                return [...values].sort((a, b) => a - b)
              })()}
              tick={({
                x,
                y,
                payload
              }: {
                x: string | number
                y: string | number
                payload: { value: number }
              }) => {
                const lastPoint = chartData[chartData.length - 1]
                const used = lastPoint?.used ?? 0
                const combined = lastPoint?.combined ?? 0
                let fill = 'var(--finance-placeholder)'
                if (payload.value === used && used > 0) fill = 'var(--finance-primary)'
                else if (payload.value === combined && combined !== used)
                  fill = 'var(--finance-neutral)'
                else if (payload.value === totalBudget) fill = 'var(--finance-neutral)'
                return (
                  <text
                    x={x}
                    y={y}
                    dy={4}
                    textAnchor="end"
                    fontSize={11}
                    fill={fill}
                    fontWeight={payload.value === totalBudget ? 600 : 400}
                  >
                    {formatAxis(payload.value)}
                  </text>
                )
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v, name) => {
                const val = `\u20A9${(Number(v) || 0).toLocaleString()}`
                if (name === 'combined')
                  return [val, t('dashboard.used') + ' + ' + t('dashboard.pendingAmount')]
                return [val, t('dashboard.used')]
              }}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="combined"
              name="combined"
              stroke="var(--finance-neutral)"
              strokeWidth={2}
              fill="url(#budgetCombinedFill)"
            />
            <Area
              type="monotone"
              dataKey="used"
              name="used"
              stroke="var(--finance-primary)"
              strokeWidth={2}
              fill="url(#budgetUsedFill)"
            />
            {!isZoomedIn && (
              <ReferenceLine
                y={totalBudget}
                stroke="var(--finance-placeholder)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: t('dashboard.totalBudget'),
                  position: 'insideTopLeft',
                  fontSize: 11,
                  fill: 'var(--finance-neutral)',
                  offset: 6
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
