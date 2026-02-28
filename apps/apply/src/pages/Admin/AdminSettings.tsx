import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast, TextField, Button, Badge } from 'trust-ui-react'
import { useConference } from '../../contexts/ConferenceContext'
import { useCreateConference, useUpdateConference, useDeleteConference } from '../../hooks/queries/useConferences'
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition } from '../../hooks/queries/usePositions'
import { useAuth } from '../../contexts/AuthContext'
import PageLoader from '../../components/PageLoader'
import Alert from '../../components/Alert'
import { isConferenceClosed } from '../../lib/conference'
import type { Position } from '../../types'

export default function AdminSettings() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { currentConference, conferences, loading } = useConference()
  const createConference = useCreateConference()
  const updateConference = useUpdateConference()
  const deleteConference = useDeleteConference()

  // Positions
  const { data: positions = [] } = usePositions(currentConference?.id)
  const createPosition = useCreatePosition()
  const updatePosition = useUpdatePosition()
  const deletePosition = useDeletePosition()

  // Conference form
  const [newConferenceName, setNewConferenceName] = useState('')
  const [newConferenceDesc, setNewConferenceDesc] = useState('')
  const [newConferenceDeadline, setNewConferenceDeadline] = useState('')

  // Position management
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionDesc, setNewPositionDesc] = useState('')
  const [editRequirements, setEditRequirements] = useState<string[]>([])
  const [newReqItem, setNewReqItem] = useState('')

  useEffect(() => {
    if (editingPosition) {
      setEditRequirements(editingPosition.eligibilityRequirements || [])
    }
  }, [editingPosition])

  const handleCreateConference = async () => {
    if (!newConferenceName.trim()) return
    try {
      await createConference.mutateAsync({
        name: newConferenceName.trim(),
        description: newConferenceDesc.trim(),
        deadline: newConferenceDeadline || null,
        createdBy: appUser?.uid || '',
      })
      toast({ variant: 'success', message: t('admin.settings.conference.created', '대회가 생성되었습니다.') })
      setNewConferenceName('')
      setNewConferenceDesc('')
      setNewConferenceDeadline('')
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleToggleClosed = async (id: string, currentlyClosed: boolean) => {
    try {
      await updateConference.mutateAsync({ id, isClosed: !currentlyClosed })
      toast({
        variant: 'success',
        message: currentlyClosed
          ? t('admin.settings.conference.reopened', '신청이 다시 열렸습니다.')
          : t('admin.settings.conference.closedManually', '신청이 마감되었습니다.'),
      })
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleDeleteConference = async (id: string) => {
    try {
      await deleteConference.mutateAsync(id)
      toast({ variant: 'success', message: t('admin.settings.conference.deleted', '대회가 삭제되었습니다.') })
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleCreatePosition = async () => {
    if (!currentConference || !newPositionName.trim()) return
    try {
      await createPosition.mutateAsync({
        conferenceId: currentConference.id,
        name: newPositionName.trim(),
        description: newPositionDesc.trim(),
      })
      toast({ variant: 'success', message: t('admin.settings.position.created', '포지션이 생성되었습니다.') })
      setNewPositionName('')
      setNewPositionDesc('')
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleDeletePosition = async (position: Position) => {
    if (!currentConference) return
    try {
      await deletePosition.mutateAsync({ id: position.id, conferenceId: currentConference.id })
      toast({ variant: 'success', message: t('admin.settings.position.deleted', '포지션이 삭제되었습니다.') })
      if (editingPosition?.id === position.id) setEditingPosition(null)
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleAddEditRequirement = () => {
    const trimmed = newReqItem.trim()
    if (!trimmed) return
    setEditRequirements((prev) => [...prev, trimmed])
    setNewReqItem('')
  }

  const handleRemoveEditRequirement = (index: number) => {
    setEditRequirements((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSavePosition = async () => {
    if (!editingPosition || !currentConference) return
    try {
      await updatePosition.mutateAsync({
        id: editingPosition.id,
        conferenceId: currentConference.id,
        name: editingPosition.name,
        description: editingPosition.description,
        eligibilityRequirements: editRequirements,
      })
      toast({ variant: 'success', message: t('admin.settings.saved', '설정이 저장되었습니다.') })
      setEditingPosition(null)
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {t('admin.settings.title', '설정')}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {t('admin.settings.subtitle', '대회 및 신청 관련 설정을 관리합니다.')}
      </p>

      {/* Conference Management */}
      <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
          {t('admin.settings.conference.title', '대회 관리')}
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
          {t('admin.settings.conference.description', '대회를 생성하고 관리합니다. 신청서와 추천서는 대회별로 관리됩니다.')}
        </p>

        {/* Existing Conferences */}
        {conferences.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {conferences.map((conference) => (
              <div
                key={conference.id}
                style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: conference.id === currentConference?.id ? '#eff6ff' : '#f9fafb',
                  border: `1px solid ${conference.id === currentConference?.id ? '#bfdbfe' : '#f3f4f6'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                      {conference.name}
                    </span>
                    {conference.id === currentConference?.id && (
                      <Badge variant="primary" size="sm">{t('conference.current', '현재')}</Badge>
                    )}
                    {isConferenceClosed(conference) && (
                      <Badge variant="danger" size="sm">{t('conference.closed', '마감됨')}</Badge>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggleClosed(conference.id, isConferenceClosed(conference))}
                      disabled={updateConference.isPending}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: isConferenceClosed(conference) ? '#2563eb' : '#d97706',
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      {isConferenceClosed(conference)
                        ? t('admin.settings.conference.reopen', '신청 열기')
                        : t('admin.settings.conference.close', '마감하기')}
                    </button>
                    <button
                      onClick={() => handleDeleteConference(conference.id)}
                      disabled={deleteConference.isPending}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      {t('common.delete', '삭제')}
                    </button>
                  </div>
                </div>
                {conference.description && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {conference.description}
                  </p>
                )}
                {conference.deadline && (
                  <p style={{ fontSize: '0.75rem', marginTop: '0.125rem', color: conference.deadline < new Date() ? '#dc2626' : '#6b7280' }}>
                    {t('admin.settings.conference.deadlineLabel', '마감')}: {conference.deadline.toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Conference */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <TextField
            label={t('admin.settings.conference.name', '대회명')}
            type="text"
            value={newConferenceName}
            onChange={(e) => setNewConferenceName(e.target.value)}
            placeholder={t('admin.settings.conference.namePlaceholder', '예: 2026 청소년 대회')}
            fullWidth
          />
          <TextField
            label={t('admin.settings.conference.desc', '대회 설명')}
            type="text"
            value={newConferenceDesc}
            onChange={(e) => setNewConferenceDesc(e.target.value)}
            placeholder={t('admin.settings.conference.descPlaceholder', '예: 서울 스테이크 청소년 대회')}
            fullWidth
          />
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
              {t('admin.settings.conference.deadline', '신청 마감일')}
            </label>
            <input
              type="date"
              value={newConferenceDeadline}
              onChange={(e) => setNewConferenceDeadline(e.target.value)}
              style={{
                width: '100%',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleCreateConference}
              disabled={!newConferenceName.trim() || createConference.isPending}
            >
              {t('admin.settings.conference.create', '생성')}
            </Button>
          </div>
        </div>
      </div>

      {/* Position Management (per conference) */}
      {currentConference ? (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
            {t('admin.settings.position.title', '포지션 관리')}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            <strong>{currentConference.name}</strong> {t('admin.settings.position.forConference', '대회의 포지션')}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
            {t('admin.settings.position.description', '포지션별 자격 요건을 설정합니다. 신청서/추천서 작성 시 포지션을 선택합니다.')}
          </p>

          {/* Existing Positions */}
          {positions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {positions.map((position) => (
                <div
                  key={position.id}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: editingPosition?.id === position.id ? '#eff6ff' : '#f9fafb',
                    border: `1px solid ${editingPosition?.id === position.id ? '#bfdbfe' : '#f3f4f6'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingPosition(editingPosition?.id === position.id ? null : position)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                        {position.name}
                      </span>
                      {position.eligibilityRequirements.length > 0 && (
                        <Badge variant="secondary" size="sm">
                          {t('admin.settings.position.requirementCount', '요건 {{count}}개', { count: position.eligibilityRequirements.length })}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePosition(position) }}
                      disabled={deletePosition.isPending}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        flexShrink: 0,
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      {t('common.delete', '삭제')}
                    </button>
                  </div>
                  {position.description && (
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {position.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
              {t('admin.settings.position.empty', '등록된 포지션이 없습니다.')}
            </p>
          )}

          {/* Edit Position Panel */}
          {editingPosition && (
            <div style={{ borderRadius: '0.5rem', border: '1px solid #bfdbfe', backgroundColor: '#f0f9ff', padding: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.75rem' }}>
                {t('admin.settings.position.editing', '포지션 편집')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <TextField
                  label={t('admin.settings.position.name', '포지션명')}
                  type="text"
                  value={editingPosition.name}
                  onChange={(e) => setEditingPosition({ ...editingPosition, name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={t('admin.settings.position.desc', '설명')}
                  type="text"
                  value={editingPosition.description}
                  onChange={(e) => setEditingPosition({ ...editingPosition, description: e.target.value })}
                  fullWidth
                />
              </div>

              {/* Position Eligibility Requirements */}
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                {t('admin.settings.position.requirements', '자격 요건')}
              </p>
              {editRequirements.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  {editRequirements.map((req, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.625rem',
                        borderRadius: '0.375rem',
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', color: '#111827' }}>
                        {i + 1}. {req}
                      </span>
                      <button
                        onClick={() => handleRemoveEditRequirement(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: '#dc2626',
                          flexShrink: 0,
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        {t('common.delete', '삭제')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <TextField
                  type="text"
                  value={newReqItem}
                  onChange={(e) => setNewReqItem(e.target.value)}
                  placeholder={t('admin.settings.position.requirementPlaceholder', '새 자격 요건을 입력하세요')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEditRequirement() } }}
                  fullWidth
                />
                <Button variant="outline" onClick={handleAddEditRequirement} disabled={!newReqItem.trim()}>
                  {t('common.add', '추가')}
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="primary" onClick={handleSavePosition} disabled={updatePosition.isPending}>
                  {updatePosition.isPending ? t('common.saving', '저장 중...') : t('common.save', '저장')}
                </Button>
                <Button variant="outline" onClick={() => setEditingPosition(null)}>
                  {t('common.cancel', '취소')}
                </Button>
              </div>
            </div>
          )}

          {/* Add New Position */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TextField
              label={t('admin.settings.position.newName', '새 포지션명')}
              type="text"
              value={newPositionName}
              onChange={(e) => setNewPositionName(e.target.value)}
              placeholder={t('admin.settings.position.newNamePlaceholder', '예: 운영 위원')}
              fullWidth
            />
            <TextField
              label={t('admin.settings.position.newDesc', '설명 (선택)')}
              type="text"
              value={newPositionDesc}
              onChange={(e) => setNewPositionDesc(e.target.value)}
              placeholder={t('admin.settings.position.newDescPlaceholder', '예: 대회 운영을 총괄하는 역할')}
              fullWidth
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={handleCreatePosition}
                disabled={!newPositionName.trim() || createPosition.isPending}
              >
                {t('admin.settings.position.add', '포지션 추가')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Alert variant="warning">
          {t('admin.settings.position.noConference', '대회를 먼저 생성해주세요.')}
        </Alert>
      )}
    </div>
  )
}
