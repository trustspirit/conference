import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function AwaitingAssignmentPage() {
  const { t } = useTranslation()
  const { logout, appUser } = useAuth()
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">{t('awaiting.title', '관리자 승인 대기 중')}</h1>
      <p className="text-gray-600">
        {t('awaiting.description', '관리자가 프로젝트를 배정하면 자동으로 사용 가능합니다.')}
      </p>
      <p className="text-sm text-gray-500">{appUser?.email}</p>
      <button onClick={logout} className="finance-button-secondary">
        {t('common.logout', '로그아웃')}
      </button>
    </div>
  )
}
