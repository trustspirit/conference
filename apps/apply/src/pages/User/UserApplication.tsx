import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMyApplication, useCreateApplication, useUpdateApplication } from '../../hooks/queries/useApplications'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Select, Textarea, Label } from '../../components/form'
import { StakeWardSelector } from '../../components/form'
import ToggleButton from '../../components/form/ToggleButton'
import Spinner from '../../components/Spinner'
import Alert from '../../components/Alert'
import StatusChip from '../../components/StatusChip'
import DetailsGrid from '../../components/DetailsGrid'
import { STATUS_TONES } from '../../utils/constants'
import type { Gender } from '../../types'

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
      toast(t('application.messages.submitted'))
      setEditing(false)
    } catch {
      toast(t('application.messages.failedToSubmit'), 'error')
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
      toast(t('application.messages.draftSaved'))
      setEditing(false)
    } catch {
      toast(t('application.messages.failedToSave'), 'error')
    }
  }

  const showForm = editing || !hasApp

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
            <StatusChip label={t(`status.${existingApp!.status}`, existingApp!.status)} tone={STATUS_TONES[existingApp!.status] || 'draft'} size="md" />
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
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors"
              >
                {t('application.actions.edit', '제출 내용 편집')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Application Start */}
      {!hasApp && !editing && (
        <div style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1rem' }}>{t('application.subtitle.start')}</p>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            {t('application.actions.start', '신청서 시작')}
          </button>
        </div>
      )}

      {/* Edit Form */}
      {showForm && (editing || !hasApp) && (
        <form onSubmit={handleSubmit} style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <Label>{t('application.form.name', 'Name')}</Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isLocked} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
            <div>
              <Label>{t('application.form.age', 'Age')}</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} disabled={isLocked} required />
            </div>
            <div>
              <Label>{t('application.form.gender', 'Gender')}</Label>
              <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)} disabled={isLocked}>
                <option value="male">{t('application.form.genderMale', 'Male')}</option>
                <option value="female">{t('application.form.genderFemale', 'Female')}</option>
              </Select>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <Label>{t('application.form.email', 'Email')}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLocked} required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <Label>{t('application.form.phone', 'Phone')}</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLocked} required />
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
            <Label>{t('application.form.servedMission', '선교사로 봉사')}</Label>
            <div style={{ paddingTop: '0.375rem' }}>
              <ToggleButton value={servedMission} onChange={setServedMission} disabled={isLocked} />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label>{t('application.form.additionalInfo', 'Additional Info')}</Label>
            <Textarea
              value={moreInfo}
              onChange={(e) => setMoreInfo(e.target.value)}
              disabled={isLocked}
              rows={4}
              placeholder={t('application.form.additionalInfoPlaceholder')}
            />
          </div>

          {!isLocked && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={createApp.isPending || updateApp.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createApp.isPending || updateApp.isPending ? t('common.saving') : t('application.actions.submit', '신청서 제출')}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={createApp.isPending || updateApp.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {t('application.actions.saveDraft', '초안 저장')}
              </button>
              {hasApp && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel', '취소')}
                </button>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  )
}
