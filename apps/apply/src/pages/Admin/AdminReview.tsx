import { useTranslation } from 'react-i18next'
import { useApplications, useUpdateApplicationStatus } from '../../hooks/queries/useApplications'
import { useRecommendations, useUpdateRecommendationStatus } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import ItemCard from '../../components/ItemCard'
import EmptyState from '../../components/EmptyState'
import type { ApplicationStatus, RecommendationStatus } from '../../types'

function ApproveRejectButtons({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <button onClick={onApprove} className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700">
        {t('common.approve', '승인')}
      </button>
      <button onClick={onReject} className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">
        {t('common.reject', '거부')}
      </button>
    </>
  )
}

export default function AdminReview() {
  const { t } = useTranslation()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()
  const updateAppStatus = useUpdateApplicationStatus()
  const updateRecStatus = useUpdateRecommendationStatus()

  if (loadingApps || loadingRecs) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.review.title', '신청서 검토')}</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('admin.applications', '신청서')}</h2>
        <div className="space-y-3">
          {applications?.map((app) => (
            <ItemCard
              key={app.id}
              name={app.name}
              subtitle={`${app.stake} / ${app.ward} · ${app.email}`}
              status={app.status}
              actions={
                app.status === 'awaiting' ? (
                  <ApproveRejectButtons
                    onApprove={() => updateAppStatus.mutate({ id: app.id, status: 'approved' as ApplicationStatus })}
                    onReject={() => updateAppStatus.mutate({ id: app.id, status: 'rejected' as ApplicationStatus })}
                  />
                ) : undefined
              }
            />
          ))}
          {!applications?.length && <EmptyState message={t('common.noData', '데이터가 없습니다')} />}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('admin.recommendations', '추천서')}</h2>
        <div className="space-y-3">
          {recommendations?.map((rec) => (
            <ItemCard
              key={rec.id}
              name={rec.name}
              subtitle={`${rec.stake} / ${rec.ward} · ${rec.phone}`}
              status={rec.status}
              actions={
                rec.status === 'submitted' ? (
                  <ApproveRejectButtons
                    onApprove={() => updateRecStatus.mutate({ id: rec.id, status: 'approved' as RecommendationStatus })}
                    onReject={() => updateRecStatus.mutate({ id: rec.id, status: 'rejected' as RecommendationStatus })}
                  />
                ) : undefined
              }
            />
          ))}
          {!recommendations?.length && <EmptyState message={t('common.noData', '데이터가 없습니다')} />}
        </div>
      </section>
    </div>
  )
}
