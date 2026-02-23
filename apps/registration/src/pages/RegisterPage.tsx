import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getSurveyById } from '../services/surveys'
import { submitRegistration, getResponseByCode, updateRegistration } from '../services/responses'
import RegistrationForm from '../components/RegistrationForm'
import type { Survey, SurveyResponse, RegistrationData } from '../types'

function RegisterPage(): React.ReactElement {
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

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return
      try {
        const s = await getSurveyById(surveyId)
        if (!s || !s.isActive) {
          setError('This survey is not available.')
          setLoading(false)
          return
        }
        if (s.shareToken && s.shareToken !== token) {
          setError('Invalid or missing access token.')
          setLoading(false)
          return
        }
        setSurvey(s)

        if (editCode) {
          const resp = await getResponseByCode(surveyId, editCode)
          if (resp) {
            setExistingResponse(resp)
          } else {
            setError('Invalid personal code.')
          }
        }
      } catch {
        setError('Failed to load survey.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId, editCode])

  const handleSubmit = async (data: RegistrationData) => {
    if (!surveyId) return
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
      setError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey?.title}</h1>
          {survey?.description && <p className="text-gray-600">{survey.description}</p>}
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <RegistrationForm
            initialData={existingResponse?.data}
            onSubmit={handleSubmit}
            isLoading={submitting}
            submitLabel={existingResponse ? 'Update' : 'Register'}
          />
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
