import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/queries/useApplications'
import { useRecommendations } from '../../hooks/queries/useRecommendations'
import Spinner from '../../components/Spinner'

export default function LeaderDashboard() {
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

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('leader.dashboard.title', '리더 대시보드')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">{t('leader.applicationsInArea', 'Applications in Area')}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{applications?.length || 0}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <p className="text-sm text-gray-600">{t('leader.myRecommendations', 'My Recommendations')}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{recommendations?.length || 0}</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('leader.recentApplications', 'Recent Applications')}</h2>
        <div className="space-y-3">
          {applications?.slice(0, 5).map((app) => (
            <div key={app.id} className="rounded-lg border border-gray-200 bg-white p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{app.name}</p>
                <p className="text-sm text-gray-500">{app.stake} / {app.ward}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{app.status}</span>
            </div>
          ))}
          {!applications?.length && <p className="text-gray-500 text-sm">{t('common.noData', 'No data')}</p>}
        </div>
      </section>
    </div>
  )
}
