import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import Spinner from '../components/Spinner'

const LOGIN_TIMEOUT_MS = 30_000

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, signInWithGoogle } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLoginTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (user) {
      setSigningIn(false)
      clearLoginTimeout()
    }
  }, [user, clearLoginTimeout])

  useEffect(() => () => clearLoginTimeout(), [clearLoginTimeout])

  const handleSignIn = async () => {
    setSigningIn(true)
    clearLoginTimeout()
    timeoutRef.current = setTimeout(() => {
      setSigningIn(false)
    }, LOGIN_TIMEOUT_MS)
    try {
      await signInWithGoogle()
    } catch {
      setSigningIn(false)
      clearLoginTimeout()
    }
  }

  if (loading || signingIn)
    return (
      <div className="flex items-center justify-center min-h-dvh finance-app-bg">
        <Spinner text={signingIn ? t('auth.signingIn') : t('auth.loading')} />
      </div>
    )
  if (user) return <Navigate to="/my-requests" replace />

  return (
    <div className="min-h-dvh finance-app-bg px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="finance-panel w-full max-w-5xl rounded-lg overflow-hidden grid grid-cols-1 lg:min-h-[560px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-gradient-to-br from-[#F6F7F9] to-[#E7EDF4] p-5 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            <p className="text-xl font-bold text-[#002C5F]">{t('app.title')}</p>
            <h1 className="mt-6 max-w-sm text-2xl sm:mt-16 sm:text-5xl font-bold leading-tight text-[#002C5F]">
              Conference finance operations
            </h1>
            <div className="mt-4 h-1.5 w-28 sm:w-40 bg-[#002C5F]" />
          </div>
          <p className="mt-6 hidden text-sm text-[#667085] sm:mt-12 sm:block">
            Budget requests · settlements · reports
          </p>
        </div>
        <div className="bg-white p-6 sm:p-10 lg:p-14 flex items-center">
          <div className="w-full">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#002C5F] mb-2">
                {t('auth.loginTitle')}
              </h2>
              <p className="text-[#667085] text-sm">{t('auth.loginSubtitle')}</p>
            </div>
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-[#D8DDE5] rounded-lg px-6 py-3 text-[#111827] hover:bg-[#F0F4F8] hover:border-[#B7C4D4] transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-semibold">{t('auth.googleLogin')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
