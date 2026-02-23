import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { authUserAtom, authLoadingAtom } from '../stores/authStore'
import { onAuthChange, signInWithGoogle, signOut } from '../services/firebase'
import { findResponseByCode, findResponsesByEmail } from '../services/responses'
import { getSurveyById } from '../services/surveys'
import { Spinner, Button, Input } from '../components/ui'

function HomePage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useAtom(authUserAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)

  // Code lookup
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  // Find code by email
  const [showFindCode, setShowFindCode] = useState(false)
  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [foundCode, setFoundCode] = useState<{ code: string; surveyId: string; token: string } | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setCodeLoading(true)
    setCodeError(null)
    try {
      const resp = await findResponseByCode(code)
      if (resp) {
        const survey = await getSurveyById(resp.surveyId)
        if (survey) {
          navigate(`/register/${resp.surveyId}?token=${survey.shareToken}&code=${resp.personalCode}`)
          return
        }
      }
      setCodeError(t('home.codeNotFound'))
    } catch {
      setCodeError(t('home.codeNotFound'))
    } finally {
      setCodeLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setEmailLoading(true)
    setEmailError(null)
    setFoundCode(null)
    try {
      const responses = await findResponsesByEmail(email)
      if (responses.length > 0) {
        const resp = responses[0]
        const survey = await getSurveyById(resp.surveyId)
        setFoundCode({
          code: resp.personalCode,
          surveyId: resp.surveyId,
          token: survey?.shareToken || '',
        })
      } else {
        setEmailError(t('home.findCodeNotFound'))
      }
    } catch {
      setEmailError(t('home.findCodeError'))
    } finally {
      setEmailLoading(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Main card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-6">{t('home.title')}</h1>

          {/* Code input */}
          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeError(null) }}
              placeholder={t('home.codePlaceholder')}
              className="text-center font-mono tracking-widest text-lg"
              maxLength={8}
            />
            {codeError && <p className="text-xs text-red-500 text-center">{codeError}</p>}
            <Button type="submit" size="lg" disabled={codeLoading || !code.trim()}>
              {codeLoading ? t('common.loading') : t('home.openSurvey')}
            </Button>
          </form>

          {/* Find code toggle */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => { setShowFindCode(!showFindCode); setEmailError(null); setFoundCode(null) }}
              className="text-xs text-gray-400 hover:text-primary transition-colors"
            >
              {t('home.findCode')}
            </button>
          </div>

          {/* Find code by email */}
          {showFindCode && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {foundCode ? (
                <div className="text-center space-y-3">
                  <div className="bg-primary-light border border-primary/20 rounded-lg p-3">
                    <p className="text-xs text-primary-text mb-1">{t('register.success.personalCode')}</p>
                    <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">{foundCode.code}</p>
                  </div>
                  <a
                    href={`/register/${foundCode.surveyId}?token=${foundCode.token}&code=${foundCode.code}`}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    {t('register.success.editLink')}
                  </a>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <p className="text-xs text-gray-500">{t('home.findCodeDesc')}</p>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
                    placeholder={t('home.emailPlaceholder')}
                  />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                  <Button type="submit" size="md" className="w-full" disabled={emailLoading || !email.trim()}>
                    {emailLoading ? t('common.loading') : t('home.findCodeSubmit')}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Admin section */}
        <div className="text-center space-y-1.5">
          {user ? (
            <>
              <p className="text-xs text-gray-400">{user.email}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="text-xs text-primary hover:underline"
                >
                  {t('home.adminLink')} →
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {t('common.signOut')}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('home.adminLogin')} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
