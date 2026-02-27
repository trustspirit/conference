import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/queries/useApplications'
import { useRecommendations } from '../../hooks/queries/useRecommendations'
import Spinner from '../../components/Spinner'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()

  if (loadingApps || loadingRecs) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const stats = {
    totalApplications: applications?.length || 0,
    awaitingApplications: applications?.filter((a) => a.status === 'awaiting').length || 0,
    approvedApplications: applications?.filter((a) => a.status === 'approved').length || 0,
    rejectedApplications: applications?.filter((a) => a.status === 'rejected').length || 0,
    totalRecommendations: recommendations?.length || 0,
    submittedRecommendations: recommendations?.filter((r) => r.status === 'submitted').length || 0,
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.dashboard.title', '대시보드')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('admin.totalApplications', 'Total Applications')} value={stats.totalApplications} />
        <StatCard label={t('admin.awaiting', 'Awaiting Review')} value={stats.awaitingApplications} color="yellow" />
        <StatCard label={t('admin.approved', 'Approved')} value={stats.approvedApplications} color="green" />
        <StatCard label={t('admin.rejected', 'Rejected')} value={stats.rejectedApplications} color="red" />
        <StatCard label={t('admin.totalRecommendations', 'Total Recommendations')} value={stats.totalRecommendations} />
        <StatCard label={t('admin.submittedRecommendations', 'Submitted')} value={stats.submittedRecommendations} color="blue" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'gray' }: { label: string; value: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
  }
  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
