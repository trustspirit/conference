import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplications, useUpdateApplicationStatus } from '../../hooks/queries/useApplications'
import { useRecommendations, useUpdateRecommendationStatus } from '../../hooks/queries/useRecommendations'
import { useConference } from '../../contexts/ConferenceContext'
import { useToast, Tabs, Badge, Button, Dialog } from 'trust-ui-react'
import PageLoader from '../../components/PageLoader'
import EmptyState from '../../components/EmptyState'
import DetailsGrid from '../../components/DetailsGrid'
import Alert from '../../components/Alert'
import Drawer from '../../components/Drawer'
import ReviewStatsBar from '../../components/ReviewStatsBar'
import { ADMIN_REVIEW_TABS, STATUS_TONES } from '../../utils/constants'
import { exportReviewItemsToCSV } from '../../utils/exportData'
import type { ApplicationStatus, RecommendationStatus, ReviewItem } from '../../types'

const TONE_TO_BADGE: Record<string, 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'> = {
  draft: 'secondary',
  awaiting: 'warning',
  approved: 'success',
  rejected: 'danger',
  submitted: 'info',
  pending: 'warning',
  stakePresident: 'success',
}

function isToday(date: Date): boolean {
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

export default function AdminReview() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: applications, isLoading: loadingApps } = useApplications()
  const { data: recommendations, isLoading: loadingRecs } = useRecommendations()
  const { currentConference, conferences } = useConference()
  const updateAppStatus = useUpdateApplicationStatus()
  const updateRecStatus = useUpdateRecommendationStatus()

  const conferenceMap = useMemo(() => {
    const map: Record<string, string> = {}
    conferences.forEach((c) => { map[c.id] = c.name })
    return map
  }, [conferences])
  const showConferenceName = !currentConference

  const [activeTab, setActiveTab] = useState<string>(ADMIN_REVIEW_TABS.ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [todayOnly, setTodayOnly] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; item: ReviewItem | null; newStatus: string }>({
    open: false, item: null, newStatus: '',
  })

  const isMutating = updateAppStatus.isPending || updateRecStatus.isPending

  const allItems: ReviewItem[] = useMemo(() => {
    const items: ReviewItem[] = []
    ;(applications || []).filter((app) => app.status !== 'draft').forEach((app) => {
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
        conferenceName: app.conferenceId ? conferenceMap[app.conferenceId] : undefined,
      })
    })
    ;(recommendations || []).forEach((rec) => {
      if (rec.status === 'draft') return
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
        conferenceName: rec.conferenceId ? conferenceMap[rec.conferenceId] : undefined,
      })
    })
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [applications, recommendations, conferenceMap])

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

  // Drawer navigation
  const currentIndex = filteredItems.findIndex((it) => it.key === selectedId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < filteredItems.length - 1
  const goToPrev = () => { if (hasPrev) setSelectedId(filteredItems[currentIndex - 1].key) }
  const goToNext = () => { if (hasNext) setSelectedId(filteredItems[currentIndex + 1].key) }

  const navigateToNext = () => {
    const awaitingItems = allItems.filter((it) => it.status === 'awaiting')
    const currentIdx = awaitingItems.findIndex((it) => it.key === selectedId)
    const nextItem = awaitingItems[currentIdx + 1]
    if (nextItem) {
      setSelectedId(nextItem.key)
    } else {
      setSelectedId(null)
      toast({ variant: 'info', message: t('admin.review.allReviewed', '모든 검토를 완료했습니다.') })
    }
  }

  const tabCounts = useMemo(() => ({
    all: allItems.length,
    awaiting: allItems.filter((it) => it.status === 'awaiting').length,
    approved: allItems.filter((it) => it.status === 'approved').length,
    rejected: allItems.filter((it) => it.status === 'rejected').length,
  }), [allItems])

  const handleStatusChange = (newStatus: string | string[]) => {
    const status = newStatus as string
    if (!selected || status === selected.rawStatus) return
    setConfirmDialog({ open: true, item: selected, newStatus: status })
  }

  const executeStatusChange = () => {
    const { item, newStatus } = confirmDialog
    if (!item) return
    const statusLabel = t(`admin.review.status.${newStatus}`, newStatus)
    const onSuccess = () => {
      toast({ variant: 'success', message: t('admin.review.updateStatus', { name: item.name }) + ` → ${statusLabel}` })
      navigateToNext()
    }
    const onError = () => toast({ variant: 'danger', message: t('errors.generic') })

    if (item.type === 'application') {
      updateAppStatus.mutate({ id: item.entityId, status: newStatus as ApplicationStatus }, { onSuccess, onError })
    } else {
      updateRecStatus.mutate({ id: item.entityId, status: newStatus as RecommendationStatus }, { onSuccess, onError })
    }
    setConfirmDialog({ open: false, item: null, newStatus: '' })
  }

  const handleExport = () => {
    const approvedItems = allItems.filter((it) => it.status === 'approved')
    exportReviewItemsToCSV(approvedItems, `approved-${new Date().toISOString().split('T')[0]}.csv`)
    toast({ variant: 'info', message: t('admin.review.export') })
  }

  const handleSelectItem = (key: string) => {
    setSelectedId(key)
  }
  const handleBackToList = () => {
    setSelectedId(null)
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
          <Button
            variant={todayOnly ? 'primary' : 'outline'}
            size="sm"
            shape="pill"
            onClick={() => setTodayOnly(!todayOnly)}
          >
            {t('admin.dashboard.overview.today', 'Today')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            {t('admin.review.export', 'CSV 내보내기')}
          </Button>
        </div>
      </div>

      {todayOnly && (
        <div style={{ marginBottom: '0.5rem' }}>
          <Alert variant="info">{t('admin.review.filterToday', '오늘 제출된 항목만 표시')}</Alert>
        </div>
      )}

      <ReviewStatsBar items={allItems} />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value={ADMIN_REVIEW_TABS.ALL}>{t('admin.review.tabs.all', '전체')} ({tabCounts.all})</Tabs.Trigger>
          <Tabs.Trigger value={ADMIN_REVIEW_TABS.AWAITING}>{t('admin.review.tabs.awaiting', '대기 중')} ({tabCounts.awaiting})</Tabs.Trigger>
          <Tabs.Trigger value={ADMIN_REVIEW_TABS.APPROVED}>{t('admin.review.tabs.approved', '승인됨')} ({tabCounts.approved})</Tabs.Trigger>
          <Tabs.Trigger value={ADMIN_REVIEW_TABS.REJECTED}>{t('admin.review.tabs.rejected', '다음 기회에')} ({tabCounts.rejected})</Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      <div style={{ marginTop: '1rem', maxHeight: '70vh', overflowY: 'auto' }} className="space-y-2">
        {filteredItems.length === 0 ? (
          <EmptyState message={t('admin.review.empty', '이 탭에 해당하는 신청서가 없습니다.')} />
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleSelectItem(item.key)}
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
                <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>{item.name}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <Badge variant={item.type === 'application' ? 'info' : 'success'} size="sm">
                    {item.type === 'application' ? t('admin.review.tags.applied', '신청') : t('admin.review.tags.recommended', '추천')}
                  </Badge>
                  <Badge variant={TONE_TO_BADGE[STATUS_TONES[item.rawStatus] || 'draft'] || 'secondary'} size="sm">
                    {t(`status.${item.rawStatus}`, item.rawStatus)}
                  </Badge>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {showConferenceName && item.conferenceName && (
                  <span style={{ color: '#2563eb', marginRight: '0.375rem' }}>[{item.conferenceName}]</span>
                )}
                {item.stake} / {item.ward}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Review Drawer */}
      <Drawer open={!!selected} onClose={handleBackToList}>
        {selected && (
          <>
            <Drawer.Header
              onClose={handleBackToList}
              extra={
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {currentIndex >= 0 ? currentIndex + 1 : '-'} / {filteredItems.length}
                </span>
              }
            >
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>{selected.name}</h2>
              <Badge variant={selected.type === 'application' ? 'info' : 'success'}>
                {selected.type === 'application' ? t('admin.review.tags.applied', '신청') : t('admin.review.tags.recommended', '추천')}
              </Badge>
            </Drawer.Header>
            <Drawer.Content>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
                {t('admin.review.submitted', '제출됨')}: {selected.createdAt instanceof Date ? selected.createdAt.toLocaleDateString() : ''}
              </p>

              <DetailsGrid
                items={[
                  ...(showConferenceName && selected.conferenceName
                    ? [{ label: t('conference.label', '대회'), value: selected.conferenceName }]
                    : []),
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

              {/* Current Status */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.5rem' }}>
                  {t('admin.review.statusLabel', '상태')}
                </p>
                <Badge variant={TONE_TO_BADGE[STATUS_TONES[selected.rawStatus] || 'draft'] || 'secondary'}>
                  {t(`status.${selected.rawStatus}`, selected.rawStatus)}
                </Badge>
              </div>
            </Drawer.Content>
            <Drawer.Footer>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="outline" size="sm" onClick={goToPrev} disabled={!hasPrev}>
                    ◀ {t('common.prev', '이전')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNext} disabled={!hasNext}>
                    {t('common.next', '다음')} ▶
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange('approved')}
                    disabled={isMutating || selected.rawStatus === 'approved'}
                  >
                    {t('admin.review.status.approved', '승인')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleStatusChange('rejected')}
                    disabled={isMutating || selected.rawStatus === 'rejected'}
                  >
                    {t('admin.review.status.rejected', '거절')}
                  </Button>
                </div>
              </div>
            </Drawer.Footer>
          </>
        )}
      </Drawer>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, item: null, newStatus: '' })} size="sm">
        <Dialog.Title onClose={() => setConfirmDialog({ open: false, item: null, newStatus: '' })}>{t('common.confirm')}</Dialog.Title>
        <Dialog.Content>
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>
            {confirmDialog.item && `${t('admin.review.updateStatus', { name: confirmDialog.item.name })} → ${t(`admin.review.status.${confirmDialog.newStatus}`, confirmDialog.newStatus)}`}
          </p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={() => setConfirmDialog({ open: false, item: null, newStatus: '' })}>{t('common.cancel', '취소')}</Button>
          <Button variant="primary" onClick={executeStatusChange}>{t('common.confirm', '확인')}</Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  )
}
