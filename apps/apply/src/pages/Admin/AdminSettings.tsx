import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast, TextField, Button, Badge } from 'trust-ui-react'
import { useConference } from '../../contexts/ConferenceContext'
import { useCreateConference, useUpdateConference, useDeleteConference } from '../../hooks/queries/useConferences'
import { useAuth } from '../../contexts/AuthContext'
import PageLoader from '../../components/PageLoader'
import Alert from '../../components/Alert'

export default function AdminSettings() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { currentConference, conferences, loading } = useConference()
  const createConference = useCreateConference()
  const updateConference = useUpdateConference()
  const deleteConference = useDeleteConference()

  // Conference form
  const [newConferenceName, setNewConferenceName] = useState('')
  const [newConferenceDesc, setNewConferenceDesc] = useState('')

  // Eligibility for current conference
  const [requirements, setRequirements] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    if (currentConference) {
      setRequirements(currentConference.eligibilityRequirements || [])
    }
  }, [currentConference])

  const handleCreateConference = async () => {
    if (!newConferenceName.trim()) return
    try {
      await createConference.mutateAsync({
        name: newConferenceName.trim(),
        description: newConferenceDesc.trim(),
        createdBy: appUser?.uid || '',
      })
      toast({ variant: 'success', message: t('admin.settings.conference.created', '대회가 생성되었습니다.') })
      setNewConferenceName('')
      setNewConferenceDesc('')
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

  const handleAddRequirement = () => {
    const trimmed = newItem.trim()
    if (!trimmed) return
    setRequirements((prev) => [...prev, trimmed])
    setNewItem('')
  }

  const handleRemoveRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveRequirements = async () => {
    if (!currentConference) return
    try {
      await updateConference.mutateAsync({ id: currentConference.id, eligibilityRequirements: requirements })
      toast({ variant: 'success', message: t('admin.settings.saved', '설정이 저장되었습니다.') })
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  backgroundColor: conference.id === currentConference?.id ? '#eff6ff' : '#f9fafb',
                  border: `1px solid ${conference.id === currentConference?.id ? '#bfdbfe' : '#f3f4f6'}`,
                }}
              >
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                    {conference.name}
                  </span>
                  {conference.id === currentConference?.id && (
                    <Badge variant="primary" size="sm" style={{ marginLeft: '0.5rem' }}>
                      {t('conference.current', '현재')}
                    </Badge>
                  )}
                  {conference.description && (
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                      {conference.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteConference(conference.id)}
                  disabled={deleteConference.isPending}
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

        {/* Create Conference */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextField
              label={t('admin.settings.conference.name', '대회명')}
              type="text"
              value={newConferenceName}
              onChange={(e) => setNewConferenceName(e.target.value)}
              placeholder={t('admin.settings.conference.namePlaceholder', '예: 2026 청소년 대회')}
              fullWidth
            />
          </div>
          <Button
            variant="primary"
            onClick={handleCreateConference}
            disabled={!newConferenceName.trim() || createConference.isPending}
          >
            {t('admin.settings.conference.create', '생성')}
          </Button>
        </div>
      </div>

      {/* Eligibility Requirements (per conference) */}
      {currentConference ? (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
            {t('admin.settings.eligibility.title', '자격 요건 관리')}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            <strong>{currentConference.name}</strong> {t('admin.settings.eligibility.forConference', '대회의 자격 요건')}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.25rem' }}>
            {t('admin.settings.eligibility.description', '신청서/추천서 작성 화면에 표시됩니다.')}
          </p>

          {/* Requirements List */}
          {requirements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {requirements.map((req, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', color: '#111827' }}>
                    {i + 1}. {req}
                  </span>
                  <button
                    onClick={() => handleRemoveRequirement(i)}
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
          ) : (
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginBottom: '1rem' }}>
              {t('admin.settings.eligibility.empty', '등록된 자격 요건이 없습니다.')}
            </p>
          )}

          {/* Add New Item */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <TextField
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={t('admin.settings.eligibility.placeholder', '새 자격 요건을 입력하세요')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRequirement() } }}
              fullWidth
            />
            <Button variant="outline" onClick={handleAddRequirement} disabled={!newItem.trim()}>
              {t('common.add', '추가')}
            </Button>
          </div>

          <Button
            variant="primary"
            onClick={handleSaveRequirements}
            disabled={updateConference.isPending}
          >
            {updateConference.isPending
              ? t('common.saving', '저장 중...')
              : t('common.save', '저장')}
          </Button>
        </div>
      ) : (
        <Alert variant="warning">
          {t('admin.settings.eligibility.noConference', '대회를 먼저 생성해주세요.')}
        </Alert>
      )}
    </div>
  )
}
