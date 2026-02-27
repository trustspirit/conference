import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useMyRecommendations,
  useCreateRecommendation,
  useUpdateRecommendation,
  useDeleteRecommendation,
  useUpdateRecommendationStatus,
} from '../../hooks/queries/useRecommendations'
import { useRecommendationComments, useCreateComment, useDeleteComment } from '../../hooks/queries/useRecommendationComments'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Select, Textarea, Label } from '../../components/form'
import ToggleButton from '../../components/form/ToggleButton'
import Spinner from '../../components/Spinner'
import Tabs from '../../components/Tabs'
import StatusChip from '../../components/StatusChip'
import DetailsGrid from '../../components/DetailsGrid'
import Alert from '../../components/Alert'
import EmptyState from '../../components/EmptyState'
import { RECOMMENDATION_TABS, STATUS_TONES } from '../../utils/constants'
import type { Gender, RecommendationStatus, LeaderRecommendation } from '../../types'

export default function LeaderRecommendations() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { data: recommendations, isLoading } = useMyRecommendations()
  const createRec = useCreateRecommendation()
  const updateRec = useUpdateRecommendation()
  const deleteRec = useDeleteRecommendation()
  const updateStatus = useUpdateRecommendationStatus()

  const [activeTab, setActiveTab] = useState<string>(RECOMMENDATION_TABS.ALL)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null) // null = new, id = editing
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formAge, setFormAge] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formGender, setFormGender] = useState<Gender>('male')
  const [formMoreInfo, setFormMoreInfo] = useState('')
  const [formServedMission, setFormServedMission] = useState(false)

  const selected = selectedId ? recommendations?.find((r) => r.id === selectedId) || null : null

  const filteredRecs = useMemo(() => {
    const recs = recommendations || []
    if (activeTab === RECOMMENDATION_TABS.ALL) return recs
    return recs.filter((r) => r.status === activeTab)
  }, [recommendations, activeTab])

  const tabCounts = useMemo(() => {
    const recs = recommendations || []
    return {
      all: recs.length,
      draft: recs.filter((r) => r.status === 'draft').length,
      submitted: recs.filter((r) => r.status === 'submitted').length,
      approved: recs.filter((r) => r.status === 'approved').length,
      rejected: recs.filter((r) => r.status === 'rejected').length,
    }
  }, [recommendations])

  const tabs = [
    { id: RECOMMENDATION_TABS.ALL, label: t('leader.recommendations.tabs.all', '전체'), count: tabCounts.all },
    { id: RECOMMENDATION_TABS.DRAFT, label: t('leader.recommendations.tabs.draft', '초안'), count: tabCounts.draft },
    { id: RECOMMENDATION_TABS.SUBMITTED, label: t('leader.recommendations.tabs.submitted', '검토 대기 중'), count: tabCounts.submitted },
    { id: RECOMMENDATION_TABS.APPROVED, label: t('leader.recommendations.tabs.approved', '승인됨'), count: tabCounts.approved },
    { id: RECOMMENDATION_TABS.REJECTED, label: t('leader.recommendations.tabs.rejected', '다음 기회에'), count: tabCounts.rejected },
  ]

  const resetForm = () => {
    setFormName('')
    setFormAge('')
    setFormEmail('')
    setFormPhone('')
    setFormGender('male')
    setFormMoreInfo('')
    setFormServedMission(false)
    setShowForm(false)
    setEditingId(null)
  }

  const openEditForm = (rec: LeaderRecommendation) => {
    setFormName(rec.name)
    setFormAge(String(rec.age))
    setFormEmail(rec.email || '')
    setFormPhone(rec.phone)
    setFormGender(rec.gender)
    setFormMoreInfo(rec.moreInfo)
    setFormServedMission(rec.servedMission || false)
    setEditingId(rec.id)
    setShowForm(true)
  }

  const openNewForm = () => {
    resetForm()
    setShowForm(true)
  }

  const handleSaveDraft = async () => {
    const data = {
      name: formName,
      age: Number(formAge),
      email: formEmail,
      phone: formPhone,
      stake: appUser?.stake || '',
      ward: appUser?.ward || '',
      gender: formGender,
      moreInfo: formMoreInfo,
      servedMission: formServedMission,
    }
    try {
      if (editingId) {
        await updateRec.mutateAsync({ id: editingId, ...data })
      } else {
        await createRec.mutateAsync(data)
      }
      toast(t('leader.recommendations.form.messages.draftSaved'))
      resetForm()
    } catch {
      toast(t('leader.recommendations.form.messages.failedToSave'), 'error')
    }
  }

  const handleSubmitRec = async () => {
    const data = {
      name: formName,
      age: Number(formAge),
      email: formEmail,
      phone: formPhone,
      stake: appUser?.stake || '',
      ward: appUser?.ward || '',
      gender: formGender,
      moreInfo: formMoreInfo,
      servedMission: formServedMission,
    }
    try {
      if (editingId) {
        await updateRec.mutateAsync({ id: editingId, ...data, status: 'submitted' as RecommendationStatus })
      } else {
        await createRec.mutateAsync({ ...data, status: 'submitted' as RecommendationStatus })
      }
      toast(t('leader.recommendations.form.messages.submitted'))
      resetForm()
    } catch {
      toast(t('leader.recommendations.form.messages.failedToSubmit'), 'error')
    }
  }

  const handleDelete = (id: string) => {
    if (confirm(t('common.confirmDelete'))) {
      deleteRec.mutate(id, {
        onSuccess: () => toast(t('leader.recommendations.messages.removed')),
        onError: () => toast(t('leader.recommendations.messages.failedToDelete'), 'error'),
      })
      if (selectedId === id) setSelectedId(null)
    }
  }

  const handleStatusChange = (id: string, status: RecommendationStatus) => {
    updateStatus.mutate({ id, status })
  }

  const hasLinkedApplication = (rec: LeaderRecommendation) => {
    return !!rec.linkedApplicationId
  }

  const isLocked = (rec: LeaderRecommendation) => rec.status === 'approved' || rec.status === 'rejected'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('leader.recommendations.title', '추천서')}</h1>
          <p className="text-sm text-gray-500">{t('leader.recommendations.subtitle', '초안 및 제출된 추천서를 관리하세요.')}</p>
        </div>
        <button
          onClick={() => showForm ? resetForm() : openNewForm()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? t('common.cancel', '취소') : t('leader.recommendations.createRecommendation', '추천서 작성')}
        </button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div style={{ marginBottom: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
          {editingId && (
            <div style={{ marginBottom: '0.75rem' }}>
              <Alert variant="warning">{t('leader.recommendations.form.editingAlert')}</Alert>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
            <div>
              <Label>{t('leader.recommendations.form.applicantName', '지원자 이름')} *</Label>
              <Input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </div>
            <div>
              <Label>{t('leader.recommendations.form.age', '나이')} *</Label>
              <Input type="number" value={formAge} onChange={(e) => setFormAge(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
            <div>
              <Label>{t('leader.recommendations.form.email', '이메일')}</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div>
              <Label>{t('leader.recommendations.form.phone', '전화번호')} *</Label>
              <Input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
            <div>
              <Label>{t('leader.recommendations.form.gender', '성별')}</Label>
              <Select value={formGender} onChange={(e) => setFormGender(e.target.value as Gender)}>
                <option value="male">{t('leader.recommendations.form.genderMale', '형제')}</option>
                <option value="female">{t('leader.recommendations.form.genderFemale', '자매')}</option>
              </Select>
            </div>
            <div>
              <Label>{t('leader.recommendations.form.servedMission', '선교사로 봉사')}</Label>
              <div style={{ paddingTop: '0.375rem' }}>
                <ToggleButton value={formServedMission} onChange={setFormServedMission} />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <Label>{t('leader.recommendations.form.additionalInfo', '추가 정보')}</Label>
            <Textarea
              value={formMoreInfo}
              onChange={(e) => setFormMoreInfo(e.target.value)}
              rows={3}
              placeholder={t('leader.recommendations.form.additionalInfoPlaceholder')}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleSubmitRec}
              disabled={!formName || !formPhone || createRec.isPending || updateRec.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {t('leader.recommendations.form.submitRecommendation', '추천서 제출')}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={!formName || createRec.isPending || updateRec.isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {t('leader.recommendations.form.saveDraft', '초안 저장')}
            </button>
          </div>
        </div>
      )}

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: '50vh' }}>
        {/* Left: List — hidden on mobile when detail is open */}
        <div className={`lg:col-span-2 space-y-2 overflow-y-auto ${selected ? 'hidden lg:block' : ''}`} style={{ maxHeight: '70vh' }}>
          {filteredRecs.length === 0 ? (
            <EmptyState message={t('leader.recommendations.empty', '이 보기에 추천서가 아직 없습니다.')} />
          ) : (
            filteredRecs.map((rec) => (
              <button
                key={rec.id}
                onClick={() => setSelectedId(rec.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${selectedId === rec.id ? '#3b82f6' : '#e5e7eb'}`,
                  backgroundColor: selectedId === rec.id ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  display: 'block',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{rec.name}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {hasLinkedApplication(rec) && (
                      <StatusChip label={t('leader.recommendations.tags.applied', '신청됨')} tone="submitted" />
                    )}
                    <StatusChip label={t(`status.${rec.status}`, rec.status)} tone={STATUS_TONES[rec.status] || 'draft'} />
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {rec.stake} / {rec.ward} · {rec.phone}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Right: Detail */}
        <div className={`lg:col-span-3 ${selected ? '' : 'hidden lg:block'}`}>
          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedId(null)}
                className="lg:hidden mb-3 text-sm text-blue-600 flex items-center gap-1"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
              >
                <span>&larr;</span> {t('common.back', '뒤로')}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{selected.name}</h2>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {t('leader.recommendations.details.updated', '업데이트됨')}: {selected.updatedAt instanceof Date ? selected.updatedAt.toLocaleDateString() : ''}
                  </p>
                </div>
                <StatusChip label={t(`status.${selected.status}`, selected.status)} tone={STATUS_TONES[selected.status] || 'draft'} size="md" />
              </div>

              {isLocked(selected) && (
                <div style={{ marginBottom: '1rem' }}>
                  <Alert variant="info">{t('leader.recommendations.details.lockedMessage')}</Alert>
                </div>
              )}

              <DetailsGrid
                items={[
                  { label: t('common.email', 'Email'), value: selected.email || '-' },
                  { label: t('common.phone', 'Phone'), value: selected.phone },
                  { label: t('admin.review.age', 'Age'), value: String(selected.age) },
                  { label: t('admin.review.gender', 'Gender'), value: t(`gender.${selected.gender}`, selected.gender) },
                  { label: t('common.stake', 'Stake'), value: selected.stake },
                  { label: t('common.ward', 'Ward'), value: selected.ward },
                  { label: t('leader.recommendations.form.servedMission', 'Mission'), value: selected.servedMission ? t('common.yes') : t('common.no') },
                ]}
              />

              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.25rem' }}>
                  {t('leader.recommendations.details.additionalInfo', '추가 정보')}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                  {selected.moreInfo || t('leader.recommendations.details.noAdditionalInfo')}
                </p>
              </div>

              {/* Actions */}
              {!isLocked(selected) && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {selected.status === 'draft' && (
                    <>
                      <button
                        onClick={() => openEditForm(selected)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        {t('leader.recommendations.actions.modify', '수정')}
                      </button>
                      <button
                        onClick={() => handleStatusChange(selected.id, 'submitted' as RecommendationStatus)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
                      >
                        {t('leader.recommendations.actions.submit', '제출')}
                      </button>
                      <button
                        onClick={() => handleDelete(selected.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium"
                      >
                        {t('leader.recommendations.actions.delete', '삭제')}
                      </button>
                    </>
                  )}
                  {selected.status === 'submitted' && (
                    <button
                      onClick={() => handleStatusChange(selected.id, 'draft' as RecommendationStatus)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      {t('leader.recommendations.actions.cancelSubmission', '제출 취소')}
                    </button>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <CommentsSection recommendationId={selected.id} />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ minHeight: '40vh' }}>
              <p className="text-gray-400 text-sm">{t('leader.recommendations.details.selectRecommendation', '세부 정보를 검토하려면 추천서를 선택하세요.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentsSection({ recommendationId }: { recommendationId: string }) {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { data: comments, isLoading } = useRecommendationComments(recommendationId)
  const createComment = useCreateComment()
  const deleteComment = useDeleteComment()
  const [newComment, setNewComment] = useState('')

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      await createComment.mutateAsync({ recommendationId, content: newComment.trim() })
      setNewComment('')
    } catch {
      alert(t('leader.recommendations.form.messages.failedToAddComment'))
    }
  }

  const handleDeleteComment = (commentId: string) => {
    if (confirm(t('leader.recommendations.form.messages.confirmDeleteComment'))) {
      deleteComment.mutate({ id: commentId, recommendationId })
    }
  }

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
        {t('leader.recommendations.actions.viewComments', '지도자 코멘트')}
      </h3>

      {/* Comment input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('leader.recommendations.form.leaderCommentPlaceholder')}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
        />
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim() || createComment.isPending}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            opacity: !newComment.trim() || createComment.isPending ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {t('common.add', '추가')}
        </button>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <Spinner />
      ) : comments && comments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #f3f4f6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>{c.authorName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {c.createdAt instanceof Date ? c.createdAt.toLocaleDateString() : ''}
                  </span>
                  {c.authorId === appUser?.uid && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {t('common.delete', '삭제')}
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#111827' }}>{c.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t('common.noData', 'No comments')}</p>
      )}
    </div>
  )
}
