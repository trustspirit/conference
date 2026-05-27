import { useTranslation } from 'react-i18next'
import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useProjectRole } from '../hooks/useProjectRole'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import StatCard from '../components/StatCard'
import BudgetWarningBanner from '../components/BudgetWarningBanner'
import Tabs, { type TabDef } from '../components/Tabs'
import { DocumentIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '../components/Icons'
import BudgetRingGauge from '../components/dashboard/BudgetRingGauge'
import TabbedCharts from '../components/dashboard/TabbedCharts'
import BudgetSettingsSection from '../components/dashboard/BudgetSettingsSection'
import OpsBudgetTab from '../components/dashboard/OpsBudgetTab'
import { useDashboardStats } from '../hooks/queries/useCloudFunctions'
import { useBudgetUsage } from '../hooks/useBudgetUsage'
import { formatAmount } from '../lib/currency'
import { canViewOpsBudgetTab, canViewProjectOverviewTab } from '../lib/opsBudgetRoles'

type DashboardTab = 'overview' | 'opsBudget'

function OverviewTab() {
  const { t } = useTranslation()
  const { currentProject } = useProject()
  const budget = currentProject?.budgetConfig ?? { totalBudget: 0, byCode: {} }
  const projectRole = useProjectRole()

  const { data: stats, isLoading: loading, error } = useDashboardStats(currentProject?.id)
  const budgetUsage = useBudgetUsage()
  const canEditBudget = projectRole === 'admin' || projectRole === 'finance_prep'

  if (loading) return <Spinner />
  if (error) return <div className="text-center py-16 text-red-500">{t('common.loadError')}</div>
  if (!stats) return <div className="text-center py-16 text-gray-500">{t('common.noData')}</div>

  const approved = stats.approvedOnly + stats.settled

  return (
    <>
      <BudgetWarningBanner budgetUsage={budgetUsage} className="mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard
          label={t('dashboard.totalRequests')}
          value={t('form.itemCount', { count: stats.total })}
          icon={<DocumentIcon className="w-4 h-4 text-gray-400" />}
        />
        <StatCard
          label={t('dashboard.pendingRequests')}
          value={`${t('form.itemCount', { count: stats.pending })} (${formatAmount(stats.pendingAmount, 'KRW')})`}
          color="yellow"
          icon={<ClockIcon className="w-4 h-4 text-yellow-500" />}
        />
        <div className="finance-panel rounded-lg p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircleIcon className="w-4 h-4 text-finance-accent" />
            <p className="text-xs text-finance-muted">{t('dashboard.approvedRequests')}</p>
          </div>
          <p className="text-lg font-bold text-finance-text">
            {t('form.itemCount', { count: approved })} ({formatAmount(stats.approvedAmount, 'KRW')})
          </p>
          <div className="mt-2 pt-2 border-t border-finance-border-soft space-y-0.5">
            <p className="text-xs text-finance-muted">
              {t('dashboard.settledCount', { count: stats.settled })}{' '}
              {formatAmount(stats.settledAmount, 'KRW')}
            </p>
            <p className="text-xs text-finance-muted">
              {t('dashboard.unsettledCount', { count: stats.approvedOnly })}{' '}
              {formatAmount(stats.approvedOnlyAmount, 'KRW')}
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

      {canEditBudget && currentProject && (
        <BudgetSettingsSection key={currentProject.id} project={currentProject} />
      )}
    </>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const role = useProjectRole()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabs = useMemo<TabDef<DashboardTab>[]>(() => {
    const defs: TabDef<DashboardTab>[] = []
    if (canViewProjectOverviewTab(role))
      defs.push({ key: 'overview', label: t('dashboard.tabs.overview') })
    if (canViewOpsBudgetTab(role))
      defs.push({ key: 'opsBudget', label: t('dashboard.tabs.opsBudget') })
    return defs
  }, [role, t])

  const queryTab = searchParams.get('tab') as DashboardTab | null
  const initial: DashboardTab | null =
    queryTab && tabs.some((tt) => tt.key === queryTab) ? queryTab : (tabs[0]?.key ?? null)
  const [active, setActive] = useState<DashboardTab | null>(initial)

  useEffect(() => {
    if (active && tabs.some((tt) => tt.key === active)) return
    const next = tabs[0]?.key ?? null
    setActive(next)
    if (next) {
      const params = new URLSearchParams(searchParams)
      params.set('tab', next)
      setSearchParams(params, { replace: true })
    }
  }, [tabs, active, searchParams, setSearchParams])

  const handleChange = (key: DashboardTab) => {
    setActive(key)
    const next = new URLSearchParams(searchParams)
    next.set('tab', key)
    setSearchParams(next, { replace: true })
  }

  if (!active) {
    return (
      <Layout>
        <div className="text-center py-16 text-gray-500">{t('common.permissionDenied')}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <h2 className="text-xl font-bold text-finance-primary mb-4">{t('dashboard.title')}</h2>
      <Tabs<DashboardTab> tabs={tabs} active={active} onChange={handleChange} />
      <div className="pt-6">
        {active === 'overview' && <OverviewTab />}
        {active === 'opsBudget' && <OpsBudgetTab />}
      </div>
    </Layout>
  )
}
