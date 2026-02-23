import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signInWithGoogle } from '../services/firebase'
import { Button } from './ui'

function AdminLoginPage(): React.ReactElement {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError(t('auth.signInFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.admin')}</h1>
        <p className="text-gray-600 mb-6">{t('auth.signInDesc')}</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        <Button size="lg" disabled={isLoading} onClick={handleLogin}>
          {isLoading ? t('auth.signingIn') : t('auth.signInWithGoogle')}
        </Button>
      </div>
    </div>
  )
}

export default AdminLoginPage
