import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useApplications } from '../../hooks/queries/useApplications'
import { useMyRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import SummaryCard from '../../components/SummaryCard'
import { ROUTES } from '../../utils/constants'

const PIE_COLORS = ['#3b82f6', '#ec4899']
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

function isToday(date: Date): boolean {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export default function LeaderDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useMyRecommendations()

  const stats = useMemo(() => {
    const recs = recommendations || []
    const apps = applications || []
    return {
      draft: recs.filter((r) => r.status === 'draft').length,
      awaiting: recs.filter((r) => r.status === 'submitted').length,
      approved: recs.filter((r) => r.status === 'approved').length,
      rejected: recs.filter((r) => r.status === 'rejected').length,
      applicationsInStake: apps.length,
      newRecsToday: recs.filter((r) => r.createdAt && isToday(r.createdAt)).length,
      newAppsToday: apps.filter((a) => a.createdAt && isToday(a.createdAt)).length,
    }
  }, [recommendations, applications])

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
      const key = a.ward || a.stake || 'Unknown'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [applications])

  if (loadingApps || loadingRecs) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('leader.dashboard.title', '리더 대시보드')}</h1>
          <p className="text-sm text-gray-500">{t('leader.dashboard.subtitle', '추천서를 모니터링하고 지원자가 어디서 오는지 확인하세요.')}</p>
        </div>
        <button
          onClick={() => navigate(ROUTES.LEADER_RECOMMENDATIONS)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors"
        >
          {t('leader.dashboard.createRecommendation', '추천서 작성')}
        </button>
      </div>

      {/* 7 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-8">
        <SummaryCard label={t('leader.dashboard.stats.draftRecommendations', '초안 추천서')} value={stats.draft} />
        <SummaryCard label={t('leader.dashboard.stats.awaitingReview', '검토 대기 중')} value={stats.awaiting} color="yellow" />
        <SummaryCard label={t('leader.dashboard.stats.approved', '승인됨')} value={stats.approved} color="green" />
        <SummaryCard label={t('leader.dashboard.stats.rejected', '다음 기회에')} value={stats.rejected} color="red" />
        <SummaryCard label={t('leader.dashboard.stats.applicationsInStake', '스테이크 내 신청서')} value={stats.applicationsInStake} color="blue" />
        <SummaryCard label={t('leader.dashboard.stats.newRecommendationsToday', '오늘 새 추천서')} value={stats.newRecsToday} color="purple" />
        <SummaryCard label={t('leader.dashboard.stats.newApplicationsToday', '오늘 새 신청서')} value={stats.newAppsToday} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.stakeWardDistribution', '스테이크 및 와드 분포')}</h3>
          {stakeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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

        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.genderBreakdown', '성별 구성')}</h3>
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
      </div>
    </div>
  )
}
