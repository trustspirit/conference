import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import PersonalSettings from '../components/settings/PersonalSettings'

export default function ProfilePage() {
  const { t } = useTranslation()

  return (
    <Layout>
      <div className="finance-panel rounded-lg p-4 max-w-lg mx-auto sm:p-6">
        <h2 className="text-xl font-bold text-[#002C5F] mb-6">{t('project.personalSettings')}</h2>
        <PersonalSettings />
      </div>
    </Layout>
  )
}
