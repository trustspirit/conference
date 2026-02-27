import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../utils/constants'

export default function AccountSettings() {
  const { t } = useTranslation()
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title', 'Account Settings')}</h1>

      <div className="rounded-xl bg-white shadow border border-gray-200 p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">{t('common.name', 'Name')}</p>
          <p className="text-gray-900">{appUser?.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">{t('common.email', 'Email')}</p>
          <p className="text-gray-900">{appUser?.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">{t('common.role', 'Role')}</p>
          <p className="text-gray-900">{appUser?.role}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('auth.stake', 'Stake')}</p>
            <p className="text-gray-900">{appUser?.stake || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('auth.ward', 'Ward')}</p>
            <p className="text-gray-900">{appUser?.ward || '-'}</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-6 w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 font-medium hover:bg-red-50 transition-colors"
      >
        {t('auth.logout', 'Sign Out')}
      </button>
    </div>
  )
}
