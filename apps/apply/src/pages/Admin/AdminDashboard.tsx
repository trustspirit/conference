import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend } from 'recharts'
import { useApplications } from '../../hooks/queries/useApplications'
import { useRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import SummaryCard from '../../components/SummaryCard'
import EmptyState from '../../components/EmptyState'
import { ROUTES } from '../../utils/constants'

const PIE_COLORS = ['#3b82f6', '#ec4899']
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

function isToday(date: Date): boolean {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return days
}

function getDateKey(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()

  const stats = useMemo(() => {
    const apps = applications || []
    const recs = recommendations || []
    return {
      totalApplications: apps.length,
      awaiting: apps.filter((a) => a.status === 'awaiting').length,
      approved: apps.filter((a) => a.status === 'approved').length,
      rejected: apps.filter((a) => a.status === 'rejected').length,
      totalRecommendations: recs.length,
      submitted: recs.filter((r) => r.status === 'submitted').length,
      todayApps: apps.filter((a) => a.createdAt && isToday(a.createdAt)).length,
      todayRecs: recs.filter((r) => r.createdAt && isToday(r.createdAt)).length,
    }
  }, [applications, recommendations])

  const trendData = useMemo(() => {
    const days = getLast7Days()
    const apps = applications || []
    const recs = recommendations || []
    return days.map((day) => ({
      name: day,
      applications: apps.filter((a) => a.createdAt && getDateKey(a.createdAt) === day).length,
      recommendations: recs.filter((r) => r.createdAt && getDateKey(r.createdAt) === day).length,
    }))
  }, [applications, recommendations])

  const genderData = useMemo(() => {
    const apps = applications || []
    const male = apps.filter((a) => a.gender === 'male').length
    const female = apps.filter((a) => a.gender === 'female').length
    return [
      { name: t('gender.male', 'Male'), value: male },
      { name: t('gender.female', 'Female'), value: female },
    ].filter((d) => d.value > 0)
  }, [applications, t])

  const stakeData = useMemo(() => {
    const apps = applications || []
    const map: Record<string, number> = {}
    apps.forEach((a) => {
      const key = a.stake || 'Unknown'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [applications])

  const positionData = useMemo(() => {
    const apps = applications || []
    const recs = recommendations || []
    const map: Record<string, number> = {}
    apps.forEach((a) => {
      const key = a.positionName || t('position.unspecified', '미지정')
      map[key] = (map[key] || 0) + 1
    })
    recs.forEach((r) => {
      const key = r.positionName || t('position.unspecified', '미지정')
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [applications, recommendations, t])

  if (loadingApps || loadingRecs) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('admin.dashboard.title', '관리자 대시보드')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('admin.dashboard.subtitle', '신청서와 추천서 현황을 한눈에 확인하세요.')}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8">
        <SummaryCard
          label={t('admin.dashboard.overview.totalSubmissions', '전체 제출')}
          value={stats.totalApplications + stats.totalRecommendations}
        />
        <SummaryCard
          label={t('admin.dashboard.overview.awaitingReview', '검토 대기 중')}
          value={stats.awaiting + stats.submitted}
          color="yellow"
          onClick={() => navigate(ROUTES.ADMIN_REVIEW)}
        />
        <SummaryCard
          label={t('admin.dashboard.overview.approved', '승인됨')}
          value={stats.approved}
          color="green"
          onClick={() => navigate(ROUTES.ADMIN_REVIEW)}
        />
        <SummaryCard
          label={t('admin.dashboard.overview.today', '오늘')}
          value={stats.todayApps + stats.todayRecs}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend */}
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.dashboard.charts.trendTitle', '7일 추세')}</h3>
          {stats.totalApplications + stats.totalRecommendations === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <EmptyState message={t('leader.dashboard.charts.noData', 'No data')} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name={t('admin.applications', '신청서')} />
                <Line type="monotone" dataKey="recommendations" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name={t('admin.recommendations', '추천서')} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gender Distribution */}
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.genderBreakdown', 'Gender Breakdown')}</h3>
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">{t('leader.dashboard.charts.noData', 'No data')}</p>
          )}
        </div>

        {/* Position Distribution */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.dashboard.charts.positionDistribution', '포지션별 신청 현황')}</h3>
          {positionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={positionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name={t('admin.dashboard.charts.submissions', '제출 수')} radius={[4, 4, 0, 0]}>
                  {positionData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">{t('leader.dashboard.charts.noData', 'No data')}</p>
          )}
        </div>

        {/* Stake Distribution */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.stakeWardDistribution', 'Stake & Ward Distribution')}</h3>
          {stakeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name={t('admin.applications', 'Applications')} radius={[4, 4, 0, 0]}>
                  {stakeData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">{t('leader.dashboard.charts.noData', 'No data')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
