import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from 'trust-ui-react'
import { GoogleIcon } from '../../components/Icons'

export default function LoginPage() {
  const { t } = useTranslation()
  const { signInWithGoogle } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Apply</h1>
          <p className="mt-2 text-gray-600">{t('auth.loginSubtitle', 'Conference Application Management')}</p>
        </div>
        <Button
          variant="outline"
          fullWidth
          onClick={signInWithGoogle}
          startIcon={<GoogleIcon />}
        >
          {t('auth.signInWithGoogle', 'Sign in with Google')}
        </Button>
      </div>
    </div>
  )
}
