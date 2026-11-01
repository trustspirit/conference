import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { effectiveSystemRole } from '../hooks/useProjectRole'
import { useProjectSummaries, type ProjectSummary } from '../hooks/queries/useProjects'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import StatCard from '../components/StatCard'
import BudgetRingGauge from '../components/dashboard/BudgetRingGauge'
import TabbedCharts from '../components/dashboard/TabbedCharts'
import { formatAmount } from '../lib/currency'

function toDate(ts: ProjectSummary['archivedAt']): Date | null {
  if (!ts) return null
  if (ts.toDate) return ts.toDate()
  return ts.seconds ? new Date(ts.seconds * 1000) : null
}

function SummaryView({ summary }: { summary: ProjectSummary }) {
  const { t } = useTranslation()
  const { stats } = summary
  const budget = summary.budgetConfig ?? { totalBudget: 0, byCode: {} }
  const approved = stats.approvedOnly + stats.settled

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard
          label={t('dashboard.totalRequests')}
          value={t('form.itemCount', { count: stats.total })}
        />
        <StatCard
          label={t('dashboard.approvedRequests')}
          value={`${t('form.itemCount', { count: approved })} (${formatAmount(stats.approvedAmount, 'KRW')})`}
        />
        <StatCard
          label={t('dashboard.pendingRequests')}
          value={`${t('form.itemCount', { count: stats.pending })} (${formatAmount(stats.pendingAmount, 'KRW')})`}
          color="yellow"
        />
        <StatCard
          label={t('dashboard.rejectedRequests')}
          value={t('form.itemCount', { count: stats.rejected })}
          color="red"
        />
      </div>
      <div className="mb-6">
        <BudgetRingGauge
          totalBudget={budget.totalBudget}
          approvedAmount={stats.approvedAmount}
          pendingAmount={stats.pendingAmount}
        />
      </div>
      <TabbedCharts
        byCommittee={stats.byCommittee}
        byBudgetCode={stats.byBudgetCode}
        budgetByCode={budget.byCode}
        hasBudget={budget.totalBudget > 0}
        monthlyTrend={stats.monthlyTrend}
        monthlyCount={stats.monthlyCount}
        dailyTrend={stats.dailyTrend}
        dailyCount={stats.dailyCount}
      />
    </>
  )
}

export default function ArchivedReportsPage() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const sys = effectiveSystemRole(appUser)
  const isAdmin = sys === 'admin' || sys === 'super_admin'
  const { data: summaries = [], isLoading } = useProjectSummaries({ enabled: isAdmin })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (appUser && !isAdmin) return <Navigate to="/my-requests" replace />

  const sorted = [...summaries].sort(
    (a, b) => (toDate(b.archivedAt)?.getTime() ?? 0) - (toDate(a.archivedAt)?.getTime() ?? 0)
  )
  const selected = sorted.find((s) => s.projectId === selectedId) ?? sorted[0]

  return (
    <Layout>
      <h2 className="text-xl font-bold text-finance-primary mb-1">{t('archive.title')}</h2>
      <p className="text-xs text-finance-muted mb-6">{t('archive.description')}</p>

      {isLoading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500">{t('archive.empty')}</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {sorted.map((s) => (
              <button
                key={s.projectId}
                onClick={() => setSelectedId(s.projectId)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selected?.projectId === s.projectId
                    ? 'bg-finance-primary-surface text-finance-primary font-semibold'
                    : 'text-finance-text-secondary hover:bg-finance-primary-subtle'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          {selected && (
            <>
              <p className="text-xs text-finance-muted mb-4">
                {t('archive.archivedAt', {
                  date: toDate(selected.archivedAt)?.toLocaleDateString() ?? '-'
                })}
              </p>
              <SummaryView summary={selected} />
            </>
          )}
        </>
      )}
    </Layout>
  )
}
