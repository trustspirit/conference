import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSurveyById } from '../services/surveys'
import { submitRegistration, getResponseByCode, updateRegistration, submitDynamicRegistration, updateDynamicRegistration } from '../services/responses'
import { Spinner } from '../components/ui'
import RegistrationForm from '../components/RegistrationForm'
import DynamicForm from '../components/form-renderer/DynamicForm'
import ThemeProvider from '../components/ThemeProvider'
import FormHeader from '../components/form-renderer/FormHeader'
import FindCodeModal from '../components/FindCodeModal'
import type { Survey, SurveyResponse, RegistrationData } from '../types'

function RegisterPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editCode = searchParams.get('code')
  const token = searchParams.get('token')

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [existingResponse, setExistingResponse] = useState<SurveyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFindCode, setShowFindCode] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return
      try {
        const s = await getSurveyById(surveyId)
        if (!s || !s.isActive) {
          setError(t('register.error.surveyNotAvailable'))
          setLoading(false)
          return
        }
        if (s.shareToken && s.shareToken !== token) {
          setError(t('register.error.invalidToken'))
          setLoading(false)
          return
        }
        setSurvey(s)

        if (editCode) {
          const resp = await getResponseByCode(surveyId, editCode)
          if (resp) {
            setExistingResponse(resp)
          } else {
            setError(t('register.error.invalidCode'))
          }
        }
      } catch {
        setError(t('register.error.failedLoad'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId, editCode])

  const handleLegacySubmit = async (data: RegistrationData) => {
    if (!surveyId) return
    setError(null)
    setSubmitting(true)
    try {
      if (existingResponse) {
        await updateRegistration(existingResponse.id, existingResponse.participantId, data)
        navigate(`/register/${surveyId}/success?token=${token}&code=${existingResponse.personalCode}&updated=true`)
      } else {
        const result = await submitRegistration(surveyId, data)
        navigate(`/register/${surveyId}/success?token=${token}&code=${result.personalCode}`)
      }
    } catch {
      setError(t('register.error.submissionFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDynamicSubmit = async (data: Record<string, unknown>) => {
    if (!surveyId || !survey?.fields) return
    setError(null)
    setSubmitting(true)
    try {
      if (existingResponse) {
        await updateDynamicRegistration(existingResponse.id, existingResponse.participantId, data, survey.fields)
        navigate(`/register/${surveyId}/success?token=${token}&code=${existingResponse.personalCode}&updated=true`)
      } else {
        const result = await submitDynamicRegistration(surveyId, data, survey.fields)
        navigate(`/register/${surveyId}/success?token=${token}&code=${result.personalCode}`)
      }
    } catch {
      setError(t('register.error.submissionFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  const useDynamic = survey?.fields && survey.fields.length > 0

  return (
    <ThemeProvider theme={survey?.theme}>
      <div className="min-h-screen bg-gray-100 sm:py-10 sm:px-4">
        <div className="max-w-2xl mx-auto sm:shadow-lg sm:rounded-xl overflow-hidden">
          <FormHeader
            title={survey?.title || ''}
            description={survey?.description}
            theme={survey?.theme}
          />

          {error && (
            <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          {useDynamic ? (
            <DynamicForm
              fields={survey!.fields!}
              initialData={existingResponse?.data as Record<string, unknown> | undefined}
              onSubmit={handleDynamicSubmit}
              isLoading={submitting}
              submitLabel={existingResponse ? t('register.update') : t('register.register')}
            />
          ) : (
            <div className="bg-white border border-gray-200 sm:rounded-b-xl p-8">
              <RegistrationForm
                initialData={existingResponse?.data as RegistrationData | undefined}
                onSubmit={handleLegacySubmit}
                isLoading={submitting}
                submitLabel={existingResponse ? t('register.update') : t('register.register')}
              />
            </div>
          )}

          {/* Find code link */}
          <div className="py-4 text-center">
            <button
              type="button"
              onClick={() => setShowFindCode(true)}
              className="text-sm text-gray-400 hover:text-primary transition-colors"
            >
              {t('register.findCode.link')}
            </button>
          </div>
        </div>
      </div>

      {showFindCode && surveyId && (
        <FindCodeModal
          surveyId={surveyId}
          token={token}
          onClose={() => setShowFindCode(false)}
        />
      )}
    </ThemeProvider>
  )
}

export default RegisterPage
