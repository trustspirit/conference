import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function RegisterSuccessPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const updated = searchParams.get('updated')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 mb-2 font-medium">{t('register.success.personalCode')}</p>
            <p className="text-3xl font-mono font-bold text-blue-900 tracking-wider">{code}</p>
            <p className="text-xs text-blue-600 mt-2">{t('register.success.codeHint')}</p>
          </div>
        )}
        <a href={`/register/${surveyId}?token=${token}&code=${code}`} className="text-blue-600 hover:underline text-sm font-medium">
          {t('register.success.editLink')}
        </a>
      </div>
    </div>
  )
}

export default RegisterSuccessPage
