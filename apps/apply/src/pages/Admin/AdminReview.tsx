import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplications, useUpdateApplicationStatus } from '../../hooks/queries/useApplications'
import { useRecommendations, useUpdateRecommendationStatus } from '../../hooks/queries/useRecommendations'
import PageLoader from '../../components/PageLoader'
import EmptyState from '../../components/EmptyState'
import Tabs from '../../components/Tabs'
import StatusChip from '../../components/StatusChip'
import DetailsGrid from '../../components/DetailsGrid'
import Alert from '../../components/Alert'
import { Select } from '../../components/form'
import { ADMIN_REVIEW_TABS, STATUS_TONES } from '../../utils/constants'
import { exportReviewItemsToCSV } from '../../utils/exportData'
import type { ApplicationStatus, RecommendationStatus, ReviewItem } from '../../types'

function isToday(date: Date): boolean {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export default function AdminReview() {
  const { t } = useTranslation()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()
  const updateAppStatus = useUpdateApplicationStatus()
  const updateRecStatus = useUpdateRecommendationStatus()

  const [activeTab, setActiveTab] = useState<string>(ADMIN_REVIEW_TABS.ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [todayOnly, setTodayOnly] = useState(false)

  const allItems: ReviewItem[] = useMemo(() => {
    const items: ReviewItem[] = []
    ;(applications || []).forEach((app) => {
      items.push({
        key: `app-${app.id}`,
        type: 'application',
        entityId: app.id,
        status: app.status === 'awaiting' ? 'awaiting' : app.status,
        rawStatus: app.status,
        name: app.name,
        email: app.email,
        phone: app.phone,
        age: app.age,
        gender: app.gender,
        stake: app.stake,
        ward: app.ward,
        moreInfo: app.moreInfo,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        hasRecommendation: !!app.linkedRecommendationId,
        recommendationId: app.linkedRecommendationId,
      })
    })
    ;(recommendations || []).forEach((rec) => {
      if (rec.status === 'draft') return // Only show submitted/approved/rejected
      items.push({
        key: `rec-${rec.id}`,
        type: 'recommendation',
        entityId: rec.id,
        status: rec.status === 'submitted' ? 'awaiting' : rec.status,
        rawStatus: rec.status,
        name: rec.name,
        email: rec.email || '',
        phone: rec.phone,
        age: rec.age,
        gender: rec.gender,
        stake: rec.stake,
        ward: rec.ward,
        moreInfo: rec.moreInfo,
        comments: rec.comments,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        hasApplication: !!rec.linkedApplicationId,
        applicationId: rec.linkedApplicationId,
      })
    })
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [applications, recommendations])

  const filteredItems = useMemo(() => {
    let items = allItems
    if (activeTab !== ADMIN_REVIEW_TABS.ALL) {
      items = items.filter((it) => it.status === activeTab)
    }
    if (todayOnly) {
      items = items.filter((it) => isToday(it.createdAt))
    }
    return items
  }, [allItems, activeTab, todayOnly])

  const selected = selectedId ? allItems.find((it) => it.key === selectedId) || null : null

  const tabCounts = useMemo(() => ({
    all: allItems.length,
    awaiting: allItems.filter((it) => it.status === 'awaiting').length,
    approved: allItems.filter((it) => it.status === 'approved').length,
    rejected: allItems.filter((it) => it.status === 'rejected').length,
  }), [allItems])

  const tabs = [
    { id: ADMIN_REVIEW_TABS.ALL, label: t('admin.review.tabs.all', '전체'), count: tabCounts.all },
    { id: ADMIN_REVIEW_TABS.AWAITING, label: t('admin.review.tabs.awaiting', '대기 중'), count: tabCounts.awaiting },
    { id: ADMIN_REVIEW_TABS.APPROVED, label: t('admin.review.tabs.approved', '승인됨'), count: tabCounts.approved },
    { id: ADMIN_REVIEW_TABS.REJECTED, label: t('admin.review.tabs.rejected', '다음 기회에'), count: tabCounts.rejected },
  ]

  const handleStatusChange = (item: ReviewItem, newStatus: string) => {
    if (item.type === 'application') {
      updateAppStatus.mutate({ id: item.entityId, status: newStatus as ApplicationStatus })
    } else {
      updateRecStatus.mutate({ id: item.entityId, status: newStatus as RecommendationStatus })
    }
  }

  const handleExport = () => {
    const approvedItems = allItems.filter((it) => it.status === 'approved')
    exportReviewItemsToCSV(approvedItems, `approved-${new Date().toISOString().split('T')[0]}.csv`)
  }

  if (loadingApps || loadingRecs) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.review.title', '신청서 검토')}</h1>
          <p className="text-sm text-gray-500">{t('admin.review.subtitle', '들어오는 신청서를 관리하고 상태를 업데이트하세요.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTodayOnly(!todayOnly)}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: todayOnly ? '#3b82f6' : '#d1d5db',
              backgroundColor: todayOnly ? '#eff6ff' : '#fff',
              color: todayOnly ? '#2563eb' : '#6b7280',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {t('admin.dashboard.overview.today', 'Today')}
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {t('admin.review.export', 'CSV 내보내기')}
          </button>
        </div>
      </div>

      {todayOnly && (
        <div style={{ marginBottom: '0.5rem' }}>
          <Alert variant="info">{t('admin.review.filterToday', '오늘 제출된 항목만 표시')}</Alert>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: '60vh' }}>
        {/* Left: List */}
        <div className="lg:col-span-2 space-y-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {filteredItems.length === 0 ? (
            <EmptyState message={t('admin.review.empty', '이 탭에 해당하는 신청서가 없습니다.')} />
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedId(item.key)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${selectedId === item.key ? '#3b82f6' : '#e5e7eb'}`,
                  backgroundColor: selectedId === item.key ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  display: 'block',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{item.name}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <StatusChip
                      label={item.type === 'application' ? t('admin.review.tags.applied', '신청') : t('admin.review.tags.recommended', '추천')}
                      tone={item.type === 'application' ? 'submitted' : 'stakePresident'}
                    />
                    <StatusChip label={t(`status.${item.rawStatus}`, item.rawStatus)} tone={STATUS_TONES[item.rawStatus] || 'draft'} />
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {item.stake} / {item.ward}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Right: Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{selected.name}</h2>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {t('admin.review.submitted', '제출됨')}: {selected.createdAt instanceof Date ? selected.createdAt.toLocaleDateString() : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <StatusChip
                    label={selected.type === 'application' ? t('admin.review.tags.applied', '신청') : t('admin.review.tags.recommended', '추천')}
                    tone={selected.type === 'application' ? 'submitted' : 'stakePresident'}
                    size="md"
                  />
                </div>
              </div>

              <DetailsGrid
                items={[
                  { label: t('common.email', 'Email'), value: selected.email },
                  { label: t('common.phone', 'Phone'), value: selected.phone },
                  { label: t('admin.review.age', 'Age'), value: String(selected.age) },
                  { label: t('admin.review.gender', 'Gender'), value: t(`gender.${selected.gender}`, selected.gender) },
                  { label: t('common.stake', 'Stake'), value: selected.stake },
                  { label: t('common.ward', 'Ward'), value: selected.ward },
                ]}
              />

              <div style={{ marginTop: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.25rem' }}>
                  {t('admin.review.additionalInfo', '추가 정보')}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                  {selected.moreInfo || t('admin.review.noAdditionalInfo', '추가 정보가 제공되지 않았습니다.')}
                </p>
              </div>

              {/* Status Changer */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.5rem' }}>
                  {t('admin.review.statusLabel', '상태')}
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: '0.5rem' }}>
                    {t('admin.review.statusHint', '선택하면 즉시 업데이트됩니다.')}
                  </span>
                </p>
                <Select
                  value={selected.rawStatus}
                  onChange={(e) => handleStatusChange(selected, e.target.value)}
                  style={{ width: 'auto', maxWidth: '14rem' }}
                >
                  {selected.type === 'application' ? (
                    <>
                      <option value="awaiting">{t('admin.review.status.awaiting', '대기 중')}</option>
                      <option value="approved">{t('admin.review.status.approved', '승인됨')}</option>
                      <option value="rejected">{t('admin.review.status.rejected', '다음 기회에')}</option>
                    </>
                  ) : (
                    <>
                      <option value="submitted">{t('status.submitted', '제출됨')}</option>
                      <option value="approved">{t('admin.review.status.approved', '승인됨')}</option>
                      <option value="rejected">{t('admin.review.status.rejected', '다음 기회에')}</option>
                    </>
                  )}
                </Select>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ minHeight: '40vh' }}>
              <p className="text-gray-400 text-sm">{t('admin.review.selectPlaceholder', '세부 정보를 검토하려면 신청서를 선택하세요.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
