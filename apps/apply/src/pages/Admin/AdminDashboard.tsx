import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/queries/useApplications'
import { useRecommendations } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import StatCard from '../../components/StatCard'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()

  if (loadingApps || loadingRecs) return <PageLoader />

  const stats = {
    totalApplications: applications?.length || 0,
    awaiting: applications?.filter((a) => a.status === 'awaiting').length || 0,
    approved: applications?.filter((a) => a.status === 'approved').length || 0,
    rejected: applications?.filter((a) => a.status === 'rejected').length || 0,
    totalRecommendations: recommendations?.length || 0,
    submitted: recommendations?.filter((r) => r.status === 'submitted').length || 0,
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.dashboard.title', '대시보드')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('admin.totalApplications', '전체 신청서')} value={stats.totalApplications} />
        <StatCard label={t('admin.awaiting', '검토 대기 중')} value={stats.awaiting} color="yellow" />
        <StatCard label={t('admin.approved', '승인됨')} value={stats.approved} color="green" />
        <StatCard label={t('admin.rejected', '거부됨')} value={stats.rejected} color="red" />
        <StatCard label={t('admin.totalRecommendations', '전체 추천서')} value={stats.totalRecommendations} />
        <StatCard label={t('admin.submittedRecommendations', '제출됨')} value={stats.submitted} color="blue" />
      </div>
    </div>
  )
}
