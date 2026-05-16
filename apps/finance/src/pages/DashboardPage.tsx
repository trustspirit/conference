import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import StatCard from '../components/StatCard'
import BudgetWarningBanner from '../components/BudgetWarningBanner'
import { DocumentIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons'
import BudgetRingGauge from '../components/dashboard/BudgetRingGauge'
import TabbedCharts from '../components/dashboard/TabbedCharts'
import BudgetSettingsSection from '../components/dashboard/BudgetSettingsSection'
import { useDashboardStats } from '../hooks/queries/useCloudFunctions'
import { useBudgetUsage } from '../hooks/useBudgetUsage'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const budget = currentProject?.budgetConfig ?? { totalBudget: 0, byCode: {} }

  const { data: stats, isLoading: loading, error } = useDashboardStats(currentProject?.id)
  const budgetUsage = useBudgetUsage()

  const canEditBudget =
    appUser?.role === 'admin' || appUser?.role === 'super_admin' || appUser?.role === 'finance_prep'

  if (loading)
    return (
      <Layout>
        <Spinner />
      </Layout>
    )
  if (error)
    return (
      <Layout>
        <div className="text-center py-16 text-red-500">{t('common.loadError')}</div>
      </Layout>
    )
  if (!stats)
    return (
      <Layout>
        <div className="text-center py-16 text-gray-500">{t('common.noData')}</div>
      </Layout>
    )

  const approved = stats.approvedOnly + stats.settled

  return (
    <Layout>
      <h2 className="text-xl font-bold text-finance-primary mb-6">{t('dashboard.title')}</h2>

      <BudgetWarningBanner budgetUsage={budgetUsage} className="mb-6" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard
          label={t('dashboard.totalRequests')}
          value={t('form.itemCount', { count: stats.total })}
          icon={<DocumentIcon className="w-4 h-4 text-gray-400" />}
        />
        <StatCard
          label={t('dashboard.pendingRequests')}
          value={`${t('form.itemCount', { count: stats.pending })} (\u20A9${stats.pendingAmount.toLocaleString()})`}
          color="yellow"
          icon={<ClockIcon className="w-4 h-4 text-yellow-500" />}
        />
        <div className="finance-panel rounded-lg p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="w-4 h-4 text-finance-accent" />
            <p className="text-xs text-finance-muted">{t('dashboard.approvedRequests')}</p>
          </div>
          <p className="text-lg font-bold text-finance-text">
            {t('form.itemCount', { count: approved })} ({'\u20A9'}
            {stats.approvedAmount.toLocaleString()})
          </p>
          <div className="mt-2 pt-2 border-t border-finance-border-soft space-y-0.5">
            <p className="text-xs text-finance-muted">
              {t('dashboard.settledCount', { count: stats.settled })} {'\u20A9'}
              {stats.settledAmount.toLocaleString()}
            </p>
            <p className="text-xs text-finance-muted">
              {t('dashboard.unsettledCount', { count: stats.approvedOnly })} {'\u20A9'}
              {stats.approvedOnlyAmount.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 h-0.5 w-full bg-finance-accent" />
        </div>
        <StatCard
          label={t('dashboard.rejectedRequests')}
          value={t('form.itemCount', { count: stats.rejected })}
          color="red"
          icon={<XCircleIcon className="w-4 h-4 text-red-500" />}
        />
      </div>

      {/* Budget Ring Gauge */}
      <div className="mb-6">
        <BudgetRingGauge
          totalBudget={budget.totalBudget}
          approvedAmount={stats.approvedAmount}
          pendingAmount={stats.pendingAmount}
        />
      </div>

      {/* Tabbed Charts */}
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

      {canEditBudget && currentProject && (
        <BudgetSettingsSection key={currentProject.id} project={currentProject} />
      )}
    </Layout>
  )
}
