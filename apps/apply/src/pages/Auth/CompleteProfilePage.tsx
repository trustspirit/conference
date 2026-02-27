import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { Input, Select, Label } from '../../components/form'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setSaving(true)
    try {
      await updateAppUser({ role: role as UserRole, ward, stake, leaderStatus: role === 'applicant' ? null : 'pending' })
      setNeedsProfile(false)
      navigate(getDefaultRoute(role as UserRole), { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">{t('auth.completeProfile', 'Complete Your Profile')}</h1>

        <div>
          <Label>{t('auth.role', 'Role')}</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)} required>
            <option value="">{t('auth.selectRole', 'Select a role')}</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>{t('auth.stake', 'Stake')}</Label>
          <Input type="text" value={stake} onChange={(e) => setStake(e.target.value)} required />
        </div>

        <div>
          <Label>{t('auth.ward', 'Ward')}</Label>
          <Input type="text" value={ward} onChange={(e) => setWard(e.target.value)} required />
        </div>

        <button
          type="submit"
          disabled={saving || !role}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
        </button>
      </form>
    </div>
  )
}
