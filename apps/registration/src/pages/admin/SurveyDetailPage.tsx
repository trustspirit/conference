import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useToast, Button } from 'trust-ui-react'
import { getSurveyById } from '../../services/surveys'
import { getResponsesBySurvey } from '../../services/responses'
import Spinner from '../../components/ui/Spinner'
import AdminNavbar from '../../components/admin/AdminNavbar'
import ResponseTable from '../../components/admin/ResponseTable'
import SurveyStats from '../../components/admin/SurveyStats'
import type { Survey, SurveyResponse } from '../../types'

function SurveyDetailPage(): React.ReactElement {
  const { t } = useTranslation()
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'statistics' | 'responses'>('statistics')

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
    toast({ message: t('toast.linkCopied'), variant: 'success' })
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
      <AdminNavbar />
      <main className="max-w-5xl mx-auto p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" className="p-0" onClick={() => navigate('/admin')}>
            {t('common.back')}
          </Button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{survey.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{survey.description || t('survey.noDescription')}</p>
            <p className="text-xs text-gray-400 mt-1">
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
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('dashboard.statistics')}
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'responses'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('dashboard.responses')} ({responses.length})
          </button>
        </div>
        {activeTab === 'statistics' ? (
          <SurveyStats survey={survey} responses={responses} />
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('survey.responsesTitle')}</h2>
            <ResponseTable responses={responses} fields={survey.fields} />
          </>
        )}
      </main>
    </div>
  )
}

export default SurveyDetailPage
