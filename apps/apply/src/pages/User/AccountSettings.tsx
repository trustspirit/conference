import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

export default function AccountSettings() {
  const { t } = useTranslation()
  const { appUser } = useAuth()

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title', '계정 설정')}</h1>

      <div className="rounded-xl bg-white shadow border border-gray-200 p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">{t('common.name', '이름')}</p>
          <p className="text-gray-900">{appUser?.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">{t('common.email', '이메일')}</p>
          <p className="text-gray-900">{appUser?.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">{t('common.role', '역할')}</p>
          <p className="text-gray-900">{appUser?.role}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('auth.stake', '스테이크')}</p>
            <p className="text-gray-900">{appUser?.stake || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('auth.ward', '와드')}</p>
            <p className="text-gray-900">{appUser?.ward || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
