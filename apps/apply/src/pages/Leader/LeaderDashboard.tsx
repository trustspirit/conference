import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useApplications } from '../../hooks/queries/useApplications'
import { useMyRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import SummaryCard from '../../components/SummaryCard'
import { Button } from 'trust-ui-react'
import { ROUTES } from '../../utils/constants'

const POSITION_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

function isToday(date: Date): boolean {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export default function LeaderDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useMyRecommendations()

  const unspecified = t('position.unspecified', '미지정')

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

  const allItems = useMemo(() => [...(applications || []), ...(recommendations || [])], [applications, recommendations])
  const positionNames = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach((it) => set.add(it.positionName || unspecified))
    return Array.from(set).sort()
  }, [allItems, unspecified])

  // Ward/Stake by Position (stacked)
  const stakeByPosition = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    allItems.forEach((item) => {
      const ward = item.ward || item.stake || 'Unknown'
      const pos = item.positionName || unspecified
      if (!map[ward]) map[ward] = {}
      map[ward][pos] = (map[ward][pos] || 0) + 1
    })
    return Object.entries(map)
      .map(([ward, positions]) => ({ name: ward, ...positions }))
      .sort((a, b) => {
        const totalA = Object.values(a).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        const totalB = Object.values(b).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        return totalB - totalA
      })
      .slice(0, 10)
  }, [allItems, unspecified])

  // Gender by Position (stacked)
  const genderByPosition = useMemo(() => {
    const male = t('gender.male', 'Male')
    const female = t('gender.female', 'Female')
    const map: Record<string, Record<string, number>> = {}
    allItems.forEach((item) => {
      const pos = item.positionName || unspecified
      const gender = item.gender === 'male' ? male : female
      if (!map[pos]) map[pos] = {}
      map[pos][gender] = (map[pos][gender] || 0) + 1
    })
    return Object.entries(map)
      .map(([pos, genders]) => ({ name: pos, ...genders }))
      .sort((a, b) => {
        const totalA = Object.values(a).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        const totalB = Object.values(b).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        return totalB - totalA
      })
  }, [allItems, unspecified, t])

  // Position total
  const positionData = useMemo(() => {
    const recs = recommendations || []
    const map: Record<string, number> = {}
    recs.forEach((r) => {
      const pos = r.positionName || unspecified
      map[pos] = (map[pos] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [recommendations, unspecified])

  if (loadingApps || loadingRecs) return <PageLoader />

  const maleLabel = t('gender.male', 'Male')
  const femaleLabel = t('gender.female', 'Female')

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

      {/* Stat Cards */}
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
        {/* Position Total */}
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.positionDistribution', '포지션별 추천 현황')}</h3>
          {positionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={positionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name={t('leader.dashboard.charts.recommendations', '추천 수')} radius={[4, 4, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">{t('leader.dashboard.charts.noData', 'No data')}</p>
          )}
        </div>

        {/* Gender by Position (stacked) */}
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.genderByPosition', '포지션별 성별 분포')}</h3>
          {genderByPosition.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={genderByPosition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey={maleLabel} stackId="gender" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey={femaleLabel} stackId="gender" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">{t('leader.dashboard.charts.noData', 'No data')}</p>
          )}
        </div>

        {/* Ward/Stake by Position (stacked) */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('leader.dashboard.charts.stakeByPosition', '와드별 포지션 분포')}</h3>
          {stakeByPosition.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stakeByPosition}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {positionNames.map((pos, i) => (
                  <Bar
                    key={pos}
                    dataKey={pos}
                    stackId="position"
                    fill={POSITION_COLORS[i % POSITION_COLORS.length]}
                    radius={i === positionNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
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
