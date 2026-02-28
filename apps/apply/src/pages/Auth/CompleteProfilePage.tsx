import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { Select, Button } from 'trust-ui-react'
import { StakeWardSelector } from '../../components/form'
import Alert from '../../components/Alert'
import type { UserRole } from '../../types'
import { getDefaultRoute } from '../../lib/roles'

const ROLE_OPTIONS: { value: UserRole; labelKey: string }[] = [
  { value: 'applicant', labelKey: 'roles.applicant' },
  { value: 'bishop', labelKey: 'roles.bishop' },
  { value: 'stake_president', labelKey: 'roles.stakePresident' },
]

export default function CompleteProfilePage() {
  const { t } = useTranslation()
  const { updateAppUser, setNeedsProfile } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole | ''>('')
  const [ward, setWard] = useState('')
  const [stake, setStake] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isLeader = role === 'bishop' || role === 'stake_president'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setSaving(true)
    setError('')
    try {
      await updateAppUser({
        role: role as UserRole,
        ward,
        stake,
        leaderStatus: role === 'applicant' ? null : 'pending',
      })
      setNeedsProfile(false)
      navigate(getDefaultRoute(role as UserRole), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic', '오류가 발생했습니다. 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }

  const roleOptions = ROLE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }))

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.completeProfile.title', '프로필 완성')}</h1>
        <p className="text-sm text-gray-500">{t('auth.completeProfile.subtitle')}</p>

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <p style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{t('auth.completeProfile.accountType', '계정 유형')}</p>
          <Select
            options={roleOptions}
            value={role}
            onChange={(value) => setRole(value as UserRole)}
            placeholder={t('auth.selectRole', '역할을 선택하세요')}
            fullWidth
          />
        </div>

        {isLeader && (
          <Alert variant="info">{t('auth.completeProfile.approvalHint')}</Alert>
        )}

        <StakeWardSelector
          stake={stake}
          ward={ward}
          onStakeChange={setStake}
          onWardChange={setWard}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={saving || !role || !stake || !ward}
        >
          {saving ? t('auth.completeProfile.buttonLoading', '프로필 완성 중...') : t('auth.completeProfile.button', '프로필 완성')}
        </Button>
      </form>
    </div>
  )
}
