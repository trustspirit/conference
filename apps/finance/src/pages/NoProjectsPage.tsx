import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function NoProjectsPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">{t('noProjects.title', '프로젝트가 없습니다')}</h1>
      <p className="text-gray-600">
        {t('noProjects.description', '관리자 권한으로 새 프로젝트를 만들 수 있습니다.')}
      </p>
      <button onClick={() => nav('/projects/new')} className="finance-button-primary">
        {t('noProjects.createCta', '프로젝트 생성')}
      </button>
    </div>
  )
}
