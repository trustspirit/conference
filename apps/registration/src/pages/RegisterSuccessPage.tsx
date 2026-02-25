import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function RegisterSuccessPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const updated = searchParams.get('updated')
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('registrationCode')
    if (stored) {
      setCode(stored)
      sessionStorage.removeItem('registrationCode')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {updated ? t('register.success.updated') : t('register.success.registered')}
        </h1>
        <p className="text-gray-600 mb-6">
          {updated ? t('register.success.updatedDesc') : t('register.success.registeredDesc')}
        </p>
        {code && (
          <div className="bg-primary-light border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-primary-text mb-2 font-medium">{t('register.success.personalCode')}</p>
            <p className="text-3xl font-mono font-bold text-gray-900 tracking-wider">{code}</p>
            <p className="text-xs text-primary mt-2">{t('register.success.codeHint')}</p>
          </div>
        )}
        <a href={`/register/${surveyId}?token=${token}`} className="text-primary hover:underline text-sm font-medium">
          {t('register.success.editLink')}
        </a>
      </div>
    </div>
  )
}

export default RegisterSuccessPage
