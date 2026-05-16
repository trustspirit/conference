import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { useTranslation } from 'react-i18next'

interface Props {
  byCommittee: Record<string, { count: number; amount: number; approvedAmount: number }>
}

export default function CommitteeBarChart({ byCommittee }: Props) {
  const { t, i18n } = useTranslation()

  const data = Object.entries(byCommittee).map(([key, d]) => ({
    name: t(`committee.${key}`, key),
    total: d.amount,
    approved: d.approvedAmount
  }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-finance-muted text-sm">
        {t('common.noData')}
      </div>
    )
  }

  const formatYAxis = (v: number) => {
    const isKo = i18n.language === 'ko'
    if (v >= 100000000)
      return `${(v / 100000000).toFixed(v % 100000000 === 0 ? 0 : 1)}${isKo ? '억' : 'B'}`
    if (v >= 10000) return `${(v / 10000).toFixed(0)}${isKo ? '만' : 'k'}`
    return v.toLocaleString()
  }

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--finance-neutral-subtle)" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxis} />
          <Tooltip formatter={(v) => `\u20A9${(Number(v) || 0).toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="total" name={t('dashboard.amount')} fill="var(--finance-chart-muted)" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="approved"
            name={t('dashboard.approvedAmount')}
            fill="var(--finance-primary)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
