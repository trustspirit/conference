import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../../stores/toastStore'
import { getSurveyById } from '../../services/surveys'
import { getResponsesBySurvey } from '../../services/responses'
import { Button, Spinner } from '../../components/ui'
import ResponseTable from '../../components/admin/ResponseTable'
import type { Survey, SurveyResponse } from '../../types'

function SurveyDetailPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const addToast = useSetAtom(addToastAtom)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return
      try {
        const [s, r] = await Promise.all([getSurveyById(surveyId), getResponsesBySurvey(surveyId)])
        setSurvey(s)
        setResponses(r)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId])

  const copyLink = () => {
    if (!survey) return
    navigator.clipboard.writeText(`${window.location.origin}/register/${surveyId}?token=${survey.shareToken}`)
    addToast({ message: t('toast.linkCopied'), type: 'success' })
  }

  if (loading) return <Spinner />

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t('survey.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 h-14 flex items-center gap-4">
        <Button variant="link" size="sm" className="p-0" onClick={() => window.history.back()}>
          {t('common.back')}
        </Button>
        <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
      </nav>
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-gray-600">{survey.description || t('survey.noDescription')}</p>
            <p className="text-sm text-gray-400 mt-1">
              {survey.isActive ? t('common.active') : t('common.inactive')} · {responses.length} {t('survey.responses')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/admin/survey/${surveyId}/edit`}>
              <Button variant="secondary">{t('builder.editSurvey')}</Button>
            </Link>
            <Button onClick={copyLink}>{t('survey.copyRegLink')}</Button>
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('survey.responsesTitle')}</h2>
        <ResponseTable responses={responses} fields={survey.fields} />
      </main>
    </div>
  )
}

export default SurveyDetailPage
