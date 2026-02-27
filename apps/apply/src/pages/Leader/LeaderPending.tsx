import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

export default function LeaderPending() {
  const { t } = useTranslation()
  const { appUser } = useAuth()

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('leader.pendingApproval', 'Pending Approval')}</h1>
        <p className="text-gray-600">
          {t('leader.pendingMessage', 'Your leader account is pending approval. An administrator will review your request.')}
        </p>
        <div className="mt-6 space-y-2 text-sm text-gray-500">
          <p>{t('common.role', 'Role')}: {appUser?.role}</p>
          <p>{t('auth.stake', 'Stake')}: {appUser?.stake}</p>
          <p>{t('auth.ward', 'Ward')}: {appUser?.ward}</p>
        </div>
      </div>
    </div>
  )
}
