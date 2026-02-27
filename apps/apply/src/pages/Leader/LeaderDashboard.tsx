import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/queries/useApplications'
import { useMyRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import StatCard from '../../components/StatCard'
import ItemCard from '../../components/ItemCard'
import EmptyState from '../../components/EmptyState'

export default function LeaderDashboard() {
  const { t } = useTranslation()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useMyRecommendations()

  if (loadingApps || loadingRecs) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('leader.dashboard.title', '리더 대시보드')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard label={t('leader.applicationsInArea', '지역 내 신청서')} value={applications?.length || 0} />
        <StatCard label={t('leader.myRecommendations', '내 추천서')} value={recommendations?.length || 0} color="blue" />
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('leader.recentApplications', '최근 신청서')}</h2>
        <div className="space-y-3">
          {applications?.slice(0, 5).map((app) => (
            <ItemCard
              key={app.id}
              name={app.name}
              subtitle={`${app.stake} / ${app.ward}`}
              status={app.status}
            />
          ))}
          {!applications?.length && <EmptyState message={t('common.noData', '데이터가 없습니다')} />}
        </div>
      </section>
    </div>
  )
}
