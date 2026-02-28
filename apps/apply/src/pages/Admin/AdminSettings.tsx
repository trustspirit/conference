import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast, TextField, Button, Badge, Dialog } from 'trust-ui-react'
import { useConference } from '../../contexts/ConferenceContext'
import { useUpdateConference, useDeleteConference, useDeactivatedConferences, useRestoreConference, usePermanentlyDeleteConference } from '../../hooks/queries/useConferences'
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition } from '../../hooks/queries/usePositions'
import PageLoader from '../../components/PageLoader'
import Alert from '../../components/Alert'
import { isConferenceClosed } from '../../lib/conference'
import type { Position } from '../../types'

export default function AdminSettings() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { currentConference, loading } = useConference()
  const updateConference = useUpdateConference()
  const deleteConference = useDeleteConference()
  const { data: deactivatedConferences = [] } = useDeactivatedConferences()
  const restoreConference = useRestoreConference()
  const permanentlyDeleteConference = usePermanentlyDeleteConference()

  // Positions
  const { data: positions = [] } = usePositions(currentConference?.id)
  const createPosition = useCreatePosition()
  const updatePosition = useUpdatePosition()
  const deletePosition = useDeletePosition()

  // Conference edit form
  const [editConferenceName, setEditConferenceName] = useState('')
  const [editConferenceDesc, setEditConferenceDesc] = useState('')
  const [editConferenceDeadline, setEditConferenceDeadline] = useState('')

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'delete' | 'close' | 'reopen' | 'permanentDelete'; conferenceId?: string; conferenceName?: string }>({ open: false, type: 'delete' })

  // Position management
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionDesc, setNewPositionDesc] = useState('')
  const [newPositionReqs, setNewPositionReqs] = useState<string[]>([])
  const [newPositionReqItem, setNewPositionReqItem] = useState('')
  const [editRequirements, setEditRequirements] = useState<string[]>([])
  const [newReqItem, setNewReqItem] = useState('')

  useEffect(() => {
    if (editingPosition) {
      setEditRequirements(editingPosition.eligibilityRequirements || [])
    }
  }, [editingPosition])

  // Sync conference edit form from currentConference
  useEffect(() => {
    if (currentConference) {
      setEditConferenceName(currentConference.name)
      setEditConferenceDesc(currentConference.description || '')
      const dl = currentConference.deadline
      setEditConferenceDeadline(dl ? dl.toISOString().split('T')[0] : '')
    }
  }, [currentConference])

  const handleSaveConference = async () => {
    if (!currentConference || !editConferenceName.trim()) return
    try {
      await updateConference.mutateAsync({
        id: currentConference.id,
        name: editConferenceName.trim(),
        description: editConferenceDesc.trim(),
        deadline: editConferenceDeadline ? new Date(editConferenceDeadline) : null,
      })
      toast({ variant: 'success', message: t('admin.settings.conference.updated', '대회 정보가 저장되었습니다.') })
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleConfirmAction = async () => {
    const type = confirmDialog.type
    setConfirmDialog({ open: false, type: 'delete' })
    try {
      if (type === 'permanentDelete' && confirmDialog.conferenceId) {
        await permanentlyDeleteConference.mutateAsync(confirmDialog.conferenceId)
        toast({ variant: 'success', message: t('admin.settings.conference.permanentlyDeleted', '대회가 영구 삭제되었습니다.') })
        return
      }
      if (!currentConference) return
      if (type === 'delete') {
        await deleteConference.mutateAsync(currentConference.id)
        toast({ variant: 'success', message: t('admin.settings.conference.deleted', '대회가 비활성화되었습니다.') })
      } else {
        const closing = type === 'close'
        await updateConference.mutateAsync({ id: currentConference.id, isClosed: closing })
        toast({
          variant: 'success',
          message: closing
            ? t('admin.settings.conference.closedManually', '신청이 마감되었습니다.')
            : t('admin.settings.conference.reopened', '신청이 다시 열렸습니다.'),
        })
      }
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const handleRestoreConference = async (id: string) => {
    try {
      await restoreConference.mutateAsync(id)
      toast({ variant: 'success', message: t('admin.settings.conference.restored', '대회가 복원되었습니다.') })
    } catch {
      toast({ variant: 'danger', message: t('errors.generic', '오류가 발생했습니다.') })
    }
  }

  const getConfirmMessage = () => {
    switch (confirmDialog.type) {
      case 'permanentDelete':
        return t('admin.settings.conference.confirmPermanentDelete', '\"{{name}}\" 대회와 관련된 모든 데이터(신청서, 추천서, 메모, 코멘트, 포지션)가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.', { name: confirmDialog.conferenceName || '' })
      case 'delete':
        return t('admin.settings.conference.confirmDelete', '\"{{name}}\" 대회를 비활성화하시겠습니까? 30일 이내에 복원할 수 있습니다.', { name: currentConference?.name || '' })
      case 'close':
        return t('admin.settings.conference.confirmClose', '\"{{name}}\" 대회의 신청을 마감하시겠습니까?', { name: currentConference?.name || '' })
      case 'reopen':
        return t('admin.settings.conference.confirmReopen', '\"{{name}}\" 대회의 신청을 다시 열겠습니까?', { name: currentConference?.name || '' })
    }
  }

  const handleCreatePosition = async () => {
    if (!currentConference || !newPositionName.trim()) return
    try {
      await createPosition.mutateAsync({
        conferenceId: currentConference.id,
        name: newPositionName.trim(),
        description: newPositionDesc.trim(),
        eligibilityRequirements: newPositionReqs,
      })
      toast({ variant: 'success', message: t('admin.settings.position.created', '포지션이 생성되었습니다.') })
      setNewPositionName('')
      setNewPositionDesc('')
      setNewPositionReqs([])
      setNewPositionReqItem('')
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

      {/* Conference Settings */}
      {currentConference ? (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
              {t('admin.settings.conference.title', '대회 관리')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isConferenceClosed(currentConference) && (
                <Badge variant="danger" size="sm">{t('conference.closed', '마감됨')}</Badge>
              )}
              <button
                onClick={() => setConfirmDialog({ open: true, type: isConferenceClosed(currentConference) ? 'reopen' : 'close' })}
                disabled={updateConference.isPending}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: isConferenceClosed(currentConference) ? '#2563eb' : '#d97706',
                  padding: '0.25rem 0.5rem',
                }}
              >
                {isConferenceClosed(currentConference)
                  ? t('admin.settings.conference.reopen', '신청 열기')
                  : t('admin.settings.conference.close', '마감하기')}
              </button>
              <button
                onClick={() => setConfirmDialog({ open: true, type: 'delete' })}
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
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
            {t('admin.settings.conference.editDescription', '현재 선택된 대회의 정보를 수정합니다.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TextField
              label={t('admin.settings.conference.name', '대회명')}
              type="text"
              value={editConferenceName}
              onChange={(e) => setEditConferenceName(e.target.value)}
              placeholder={t('admin.settings.conference.namePlaceholder', '예: 2026 청소년 대회')}
              fullWidth
            />
            <TextField
              label={t('admin.settings.conference.desc', '대회 설명')}
              type="text"
              value={editConferenceDesc}
              onChange={(e) => setEditConferenceDesc(e.target.value)}
              placeholder={t('admin.settings.conference.descPlaceholder', '예: 서울 스테이크 청소년 대회')}
              fullWidth
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                {t('admin.settings.conference.deadline', '신청 마감일')}
              </label>
              <input
                type="date"
                value={editConferenceDeadline}
                onChange={(e) => setEditConferenceDeadline(e.target.value)}
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
                onClick={handleSaveConference}
                disabled={!editConferenceName.trim() || updateConference.isPending}
              >
                {updateConference.isPending
                  ? t('common.saving', '저장 중...')
                  : t('common.save', '저장')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <Alert variant="warning">
            {t('admin.settings.conference.noConference', '대회를 먼저 생성해주세요. 상단 대회 선택기에서 새 대회를 생성할 수 있습니다.')}
          </Alert>
        </div>
      )}

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

            {/* New position requirements */}
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                {t('admin.settings.position.requirements', '자격 요건')}
              </p>
              {newPositionReqs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  {newPositionReqs.map((req, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.625rem',
                        borderRadius: '0.375rem',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f3f4f6',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', color: '#111827' }}>
                        {i + 1}. {req}
                      </span>
                      <button
                        onClick={() => setNewPositionReqs((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', flexShrink: 0, padding: '0.25rem 0.5rem' }}
                      >
                        {t('common.delete', '삭제')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TextField
                  type="text"
                  value={newPositionReqItem}
                  onChange={(e) => setNewPositionReqItem(e.target.value)}
                  placeholder={t('admin.settings.position.requirementPlaceholder', '새 자격 요건을 입력하세요')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = newPositionReqItem.trim()
                      if (trimmed) {
                        setNewPositionReqs((prev) => [...prev, trimmed])
                        setNewPositionReqItem('')
                      }
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const trimmed = newPositionReqItem.trim()
                    if (trimmed) {
                      setNewPositionReqs((prev) => [...prev, trimmed])
                      setNewPositionReqItem('')
                    }
                  }}
                  disabled={!newPositionReqItem.trim()}
                >
                  {t('common.add', '추가')}
                </Button>
              </div>
            </div>

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

      {/* Deactivated Conferences */}
      {deactivatedConferences.length > 0 && (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
            {t('admin.settings.conference.deactivatedSection', '비활성화된 대회')}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1.25rem' }}>
            {t('admin.settings.conference.deactivatedDescription', '비활성화된 대회는 30일 후 자동으로 영구 삭제됩니다.')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {deactivatedConferences.map((conf) => {
              const daysElapsed = conf.deactivatedAt
                ? Math.floor((Date.now() - conf.deactivatedAt.getTime()) / (1000 * 60 * 60 * 24))
                : 0
              const daysRemaining = Math.max(0, 30 - daysElapsed)
              return (
                <div
                  key={conf.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                        {conf.name}
                      </span>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                        {t('admin.settings.conference.daysRemaining', '복원 가능 기간: {{days}}일', { days: daysRemaining })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outline"
                        onClick={() => handleRestoreConference(conf.id)}
                        disabled={restoreConference.isPending}
                      >
                        {t('admin.settings.conference.restore', '복원')}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDialog({ open: true, type: 'permanentDelete', conferenceId: conf.id, conferenceName: conf.name })}
                        disabled={permanentlyDeleteConference.isPending}
                      >
                        {t('admin.settings.conference.permanentDelete', '영구 삭제')}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, type: 'delete' })} size="sm">
        <Dialog.Title onClose={() => setConfirmDialog({ open: false, type: 'delete' })}>
          {t('common.confirm', '확인')}
        </Dialog.Title>
        <Dialog.Content>
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>{getConfirmMessage()}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={() => setConfirmDialog({ open: false, type: 'delete' })}>
            {t('common.cancel', '취소')}
          </Button>
          <Button variant={confirmDialog.type === 'delete' || confirmDialog.type === 'permanentDelete' ? 'danger' : 'primary'} onClick={handleConfirmAction}>
            {t('common.confirm', '확인')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  )
}
