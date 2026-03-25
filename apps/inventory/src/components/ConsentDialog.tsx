import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function ConsentDialog() {
  const { t } = useTranslation()
  const { updateAppUser, setNeedsConsent } = useAuth()

  const handleAgree = async () => {
    await updateAppUser({ consentAgreedAt: new Date().toISOString() })
    setNeedsConsent(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">{t('auth.consent')}</h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-600">{t('auth.consentMessage')}</p>
        <button
          onClick={handleAgree}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {t('auth.agree')}
        </button>
      </div>
    </div>
  )
}
