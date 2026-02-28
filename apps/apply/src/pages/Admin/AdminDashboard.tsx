import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts'
import { useApplications } from '../../hooks/queries/useApplications'
import { useRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import SummaryCard from '../../components/SummaryCard'
import EmptyState from '../../components/EmptyState'
import { ROUTES } from '../../utils/constants'
import type { Application, LeaderRecommendation } from '../../types'

const POSITION_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

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

/** Collect unique position names from both apps and recs */
function getPositionNames(items: Array<Pick<Application | LeaderRecommendation, 'positionName'>>, fallback: string): string[] {
  const set = new Set<string>()
  items.forEach((it) => set.add(it.positionName || fallback))
  return Array.from(set).sort()
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()

  const unspecified = t('position.unspecified', '미지정')

  const stats = useMemo(() => {
    const apps = applications || []
    const recs = recommendations || []
    return {
      totalApplications: apps.length,
      awaiting: apps.filter((a) => a.status === 'awaiting').length,
      approved: apps.filter((a) => a.status === 'approved').length,
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

  const allItems = useMemo(() => [...(applications || []), ...(recommendations || [])], [applications, recommendations])
  const positionNames = useMemo(() => getPositionNames(allItems, unspecified), [allItems, unspecified])

  // Position × Stake stacked bar
  const stakeByPosition = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    allItems.forEach((item) => {
      const stake = item.stake || 'Unknown'
      const pos = item.positionName || unspecified
      if (!map[stake]) map[stake] = {}
      map[stake][pos] = (map[stake][pos] || 0) + 1
    })
    return Object.entries(map)
      .map(([stake, positions]) => ({ name: stake, ...positions }))
      .sort((a, b) => {
        const totalA = Object.values(a).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        const totalB = Object.values(b).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        return totalB - totalA
      })
      .slice(0, 10)
  }, [allItems, unspecified])

  // Position × Gender stacked bar
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

  // Position total bar
  const positionData = useMemo(() => {
    const map: Record<string, number> = {}
    allItems.forEach((item) => {
      const pos = item.positionName || unspecified
      map[pos] = (map[pos] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [allItems, unspecified])

  if (loadingApps || loadingRecs) return <PageLoader />

  const maleLabel = t('gender.male', 'Male')
  const femaleLabel = t('gender.female', 'Female')

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

        {/* Position Total */}
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.dashboard.charts.positionDistribution', '포지션별 신청 현황')}</h3>
          {positionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={positionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name={t('admin.dashboard.charts.submissions', '제출 수')} radius={[4, 4, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">{t('leader.dashboard.charts.noData', 'No data')}</p>
          )}
        </div>

        {/* Gender by Position (stacked) */}
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.dashboard.charts.genderByPosition', '포지션별 성별 분포')}</h3>
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

        {/* Stake by Position (stacked) */}
        <div className="rounded-xl bg-white border border-gray-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.dashboard.charts.stakeByPosition', '스테이크별 포지션 분포')}</h3>
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
