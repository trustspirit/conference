import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useApplications } from '../../hooks/queries/useApplications'
import { useMyRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import SummaryCard from '../../components/SummaryCard'
import { Button } from 'trust-ui-react'
import { ROUTES } from '../../utils/constants'

const PIE_COLORS = ['#3b82f6', '#ec4899']
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']
const POSITION_COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6']

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

  const positionData = useMemo(() => {
    const recs = recommendations || []
    const map: Record<string, number> = {}
    recs.forEach((r) => {
      const key = r.positionName || t('position.unspecified', '미지정')
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [recommendations, t])

  if (loadingApps || loadingRecs) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('leader.dashboard.title', '리더 대시보드')}</h1>
          <p className="text-sm text-gray-500">{t('leader.dashboard.subtitle', '추천서를 모니터링하고 지원자가 어디서 오는지 확인하세요.')}</p>
        </div>
        <Button variant="primary" onClick={() => navigate(ROUTES.LEADER_RECOMMENDATIONS)}>
          {t('leader.dashboard.createRecommendation', '추천서 작성')}
        </Button>
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

        {/* Position Distribution */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.positionDistribution', '포지션별 추천 현황')}</h3>
          {positionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={positionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name={t('leader.dashboard.charts.recommendations', '추천 수')} radius={[4, 4, 0, 0]}>
                  {positionData.map((_, i) => (
                    <Cell key={i} fill={POSITION_COLORS[i % POSITION_COLORS.length]} />
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
