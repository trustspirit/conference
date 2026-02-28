import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMyApplication, useCreateApplication, useUpdateApplication } from '../../hooks/queries/useApplications'
import { useToast, TextField, Select, Switch, Button, Badge } from 'trust-ui-react'
import { useAuth } from '../../contexts/AuthContext'
import { StakeWardSelector } from '../../components/form'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'
import DetailsGrid from '../../components/DetailsGrid'
import Drawer from '../../components/Drawer'
import { STATUS_TONES } from '../../utils/constants'
import type { Gender } from '../../types'

const TONE_TO_BADGE: Record<string, 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'> = {
  draft: 'secondary',
  awaiting: 'warning',
  approved: 'success',
  rejected: 'danger',
  submitted: 'info',
  pending: 'warning',
}

export default function UserApplication() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { data: existingApp, isLoading } = useMyApplication()
  const createApp = useCreateApplication()
  const updateApp = useUpdateApplication()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [moreInfo, setMoreInfo] = useState('')
  const [servedMission, setServedMission] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const hasApp = !!existingApp
  const isLocked = existingApp?.status === 'approved' || existingApp?.status === 'rejected'
  const isDraft = existingApp?.status === 'draft'
  const isAwaiting = existingApp?.status === 'awaiting'
  const hasRecommendation = !!existingApp?.linkedRecommendationId

  useEffect(() => {
    if (existingApp) {
      setName(existingApp.name)
      setAge(String(existingApp.age))
      setEmail(existingApp.email)
      setPhone(existingApp.phone)
      setGender(existingApp.gender)
      setMoreInfo(existingApp.moreInfo)
      setServedMission(existingApp.servedMission || false)
    }
  }, [existingApp])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const getSubtitle = () => {
    if (hasRecommendation) return t('application.subtitle.hasRecommendation')
    if (isDraft) return t('application.subtitle.draftSaved')
    if (isAwaiting) return t('application.subtitle.canUpdate')
    if (isLocked) return t('application.subtitle.locked')
    return t('application.subtitle.start')
  }

  const getFormData = () => ({
    name,
    age: Number(age),
    email,
    phone,
    stake: appUser?.stake || '',
    ward: appUser?.ward || '',
    gender,
    moreInfo,
    servedMission,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = getFormData()
    try {
      if (hasApp && existingApp) {
        await updateApp.mutateAsync({ id: existingApp.id, ...data, status: 'awaiting' })
      } else {
        await createApp.mutateAsync({ ...data, status: 'awaiting' })
      }
      toast({ variant: 'success', message: t('application.messages.submitted') })
      setEditing(false)
    } catch {
      toast({ variant: 'danger', message: t('application.messages.failedToSubmit') })
    }
  }

  const handleSaveDraft = async () => {
    const data = getFormData()
    try {
      if (hasApp && existingApp) {
        await updateApp.mutateAsync({ id: existingApp.id, ...data })
      } else {
        await createApp.mutateAsync({ ...data, status: 'draft' })
      }
      toast({ variant: 'success', message: t('application.messages.draftSaved') })
      setEditing(false)
    } catch {
      toast({ variant: 'danger', message: t('application.messages.failedToSave') })
    }
  }

  const showForm = editing || !hasApp
  const statusTone = existingApp ? (STATUS_TONES[existingApp.status] || 'draft') : 'draft'

  const genderOptions = [
    { value: 'male', label: t('application.form.genderMale', 'Male') },
    { value: 'female', label: t('application.form.genderFemale', 'Female') },
  ]

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('application.title', '신청서')}</h1>
      <p className="text-sm text-gray-500 mb-6">{getSubtitle()}</p>

      {/* Recommendation Alert */}
      {hasRecommendation && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant="info" title={t('application.recommendationAlert.title')}>
            {t('application.recommendationAlert.message')}
          </Alert>
        </div>
      )}

      {/* Locked Alert */}
      {isLocked && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant="warning">{t('application.messages.lockedMessage')}</Alert>
        </div>
      )}

      {/* Application Overview (when has app and not editing) */}
      {hasApp && !showForm && (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>{t('application.overview.title', '제출 개요')}</h2>
            <Badge variant={TONE_TO_BADGE[statusTone] || 'secondary'}>
              {t(`status.${existingApp!.status}`, existingApp!.status)}
            </Badge>
          </div>

          {isDraft && (
            <div style={{ marginBottom: '1rem' }}>
              <Alert variant="warning">{t('application.overview.draftWarning')}</Alert>
            </div>
          )}

          <DetailsGrid
            items={[
              { label: t('application.overview.name', 'Name'), value: existingApp!.name },
              { label: t('application.overview.email', 'Email'), value: existingApp!.email },
              { label: t('application.overview.phone', 'Phone'), value: existingApp!.phone },
              { label: t('application.overview.age', 'Age'), value: String(existingApp!.age) },
              { label: t('application.overview.stake', 'Stake'), value: existingApp!.stake },
              { label: t('application.overview.ward', 'Ward'), value: existingApp!.ward },
              { label: t('application.overview.servedMission', 'Mission'), value: existingApp!.servedMission ? t('common.yes') : t('common.no') },
              { label: t('application.form.gender', 'Gender'), value: t(`gender.${existingApp!.gender}`) },
            ]}
          />

          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.25rem' }}>
              {t('application.overview.additionalInfo', '추가 정보')}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#111827' }}>
              {existingApp!.moreInfo || t('application.overview.noAdditionalInfo')}
            </p>
          </div>

          {!isLocked && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <Button variant="primary" onClick={() => setEditing(true)}>
                {t('application.actions.edit', '제출 내용 편집')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Application Start */}
      {!hasApp && !editing && (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1rem' }}>{t('application.subtitle.start')}</p>
          <Button variant="primary" onClick={() => setEditing(true)}>
            {t('application.actions.start', '신청서 시작')}
          </Button>
        </div>
      )}

      {/* Edit Form */}
      {showForm && (editing || !hasApp) && (
        <form onSubmit={handleSubmit} style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label={t('application.form.name', 'Name')}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLocked}
              required
              fullWidth
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
            <TextField
              label={t('application.form.age', 'Age')}
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={isLocked}
              required
              fullWidth
            />
            <div>
              <p style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{t('application.form.gender', 'Gender')}</p>
              <Select
                options={genderOptions}
                value={gender}
                onChange={(value) => setGender(value as Gender)}
                disabled={isLocked}
                fullWidth
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label={t('application.form.email', 'Email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLocked}
              required
              fullWidth
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label={t('application.form.phone', 'Phone')}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLocked}
              required
              fullWidth
            />
          </div>

          {/* Stake/Ward (readonly display) */}
          <div style={{ marginBottom: '1rem' }}>
            <StakeWardSelector
              stake={appUser?.stake || ''}
              ward={appUser?.ward || ''}
              onStakeChange={() => {}}
              onWardChange={() => {}}
              readOnly
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Switch
              label={t('application.form.servedMission', '선교사로 봉사')}
              checked={servedMission}
              onChange={setServedMission}
              disabled={isLocked}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <TextField
              label={t('application.form.additionalInfo', 'Additional Info')}
              multiline
              rows={4}
              value={moreInfo}
              onChange={(e) => setMoreInfo(e.target.value)}
              disabled={isLocked}
              placeholder={t('application.form.additionalInfoPlaceholder')}
              fullWidth
            />
          </div>

          {!isLocked && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={createApp.isPending || updateApp.isPending}
              >
                {createApp.isPending || updateApp.isPending ? t('common.saving') : t('application.actions.submit', '신청서 제출')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={createApp.isPending || updateApp.isPending}
              >
                {t('application.actions.saveDraft', '초안 저장')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                {t('application.actions.preview', '미리보기')}
              </Button>
              {hasApp && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  {t('common.cancel', '취소')}
                </Button>
              )}
            </div>
          )}
        </form>
      )}
      {/* Preview Drawer */}
      <Drawer open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <Drawer.Header onClose={() => setPreviewOpen(false)}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
            {t('application.preview.title', '신청서 미리보기')}
          </h2>
        </Drawer.Header>
        <Drawer.Content>
          <DetailsGrid
            items={[
              { label: t('application.overview.name', 'Name'), value: name || '-' },
              { label: t('application.overview.email', 'Email'), value: email || '-' },
              { label: t('application.overview.phone', 'Phone'), value: phone || '-' },
              { label: t('application.overview.age', 'Age'), value: age || '-' },
              { label: t('application.overview.stake', 'Stake'), value: appUser?.stake || '-' },
              { label: t('application.overview.ward', 'Ward'), value: appUser?.ward || '-' },
              { label: t('application.form.gender', 'Gender'), value: t(`gender.${gender}`) },
              { label: t('application.overview.servedMission', 'Mission'), value: servedMission ? t('common.yes') : t('common.no') },
            ]}
          />
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.25rem' }}>
              {t('application.overview.additionalInfo', '추가 정보')}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#111827' }}>
              {moreInfo || t('application.overview.noAdditionalInfo')}
            </p>
          </div>
        </Drawer.Content>
        <Drawer.Footer>
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            {t('common.close', '닫기')}
          </Button>
        </Drawer.Footer>
      </Drawer>
    </div>
  )
}
