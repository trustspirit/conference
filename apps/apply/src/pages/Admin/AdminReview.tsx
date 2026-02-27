import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/queries/useApplications'
import { useRecommendations } from '../../hooks/queries/useRecommendations'
import { useUpdateApplicationStatus } from '../../hooks/queries/useApplications'
import { useUpdateRecommendationStatus } from '../../hooks/queries/useRecommendations'
import Spinner from '../../components/Spinner'
import type { ApplicationStatus, RecommendationStatus } from '../../types'

export default function AdminReview() {
  const { t } = useTranslation()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()
  const updateAppStatus = useUpdateApplicationStatus()
  const updateRecStatus = useUpdateRecommendationStatus()

  if (loadingApps || loadingRecs) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const handleAppStatusChange = (id: string, status: ApplicationStatus) => {
    updateAppStatus.mutate({ id, status })
  }

  const handleRecStatusChange = (id: string, status: RecommendationStatus) => {
    updateRecStatus.mutate({ id, status })
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.review', 'Review Applications')}</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('admin.applications', 'Applications')}</h2>
        <div className="space-y-3">
          {applications?.map((app) => (
            <div key={app.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{app.name}</p>
                  <p className="text-sm text-gray-500">
                    {app.stake} / {app.ward} · {app.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{app.status}</span>
                  {app.status === 'awaiting' && (
                    <>
                      <button
                        onClick={() => handleAppStatusChange(app.id, 'approved')}
                        className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                      >
                        {t('common.approve', 'Approve')}
                      </button>
                      <button
                        onClick={() => handleAppStatusChange(app.id, 'rejected')}
                        className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
                      >
                        {t('common.reject', 'Reject')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!applications?.length && <p className="text-gray-500 text-sm">{t('common.noData', 'No data')}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('admin.recommendations', 'Recommendations')}</h2>
        <div className="space-y-3">
          {recommendations?.map((rec) => (
            <div key={rec.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{rec.name}</p>
                  <p className="text-sm text-gray-500">
                    {rec.stake} / {rec.ward} · {rec.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{rec.status}</span>
                  {rec.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleRecStatusChange(rec.id, 'approved')}
                        className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                      >
                        {t('common.approve', 'Approve')}
                      </button>
                      <button
                        onClick={() => handleRecStatusChange(rec.id, 'rejected')}
                        className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
                      >
                        {t('common.reject', 'Reject')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!recommendations?.length && <p className="text-gray-500 text-sm">{t('common.noData', 'No data')}</p>}
        </div>
      </section>
    </div>
  )
}
