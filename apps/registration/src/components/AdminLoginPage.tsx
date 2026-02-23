import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signInWithGoogle } from '../services/firebase'

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.admin')}</h1>
        <p className="text-gray-600 mb-6">{t('auth.signInDesc')}</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        <button onClick={handleLogin} disabled={isLoading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
          {isLoading ? t('auth.signingIn') : t('auth.signInWithGoogle')}
        </button>
      </div>
    </div>
  )
}

export default AdminLoginPage
