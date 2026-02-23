import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../../stores/toastStore'
import { getSurveyById } from '../../services/surveys'
import { getResponsesBySurvey } from '../../services/responses'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

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
        <Link to="/admin" className="text-blue-600 hover:underline font-medium">{t('common.back')}</Link>
        <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
      </nav>
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-gray-600">{survey.description || t('survey.noDescription')}</p>
            <p className="text-sm text-gray-400 mt-1">{survey.isActive ? t('common.active') : t('common.inactive')} · {responses.length} {t('survey.responses')}</p>
          </div>
          <button onClick={copyLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">{t('survey.copyRegLink')}</button>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('survey.responsesTitle')}</h2>
        {responses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t('survey.noResponses')}</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.number')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.name')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.email')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.phone')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.ward')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.code')}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{t('survey.table.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp, index) => (
                    <tr key={resp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{resp.data.name}</td>
                      <td className="px-4 py-3 text-gray-600">{resp.data.email}</td>
                      <td className="px-4 py-3 text-gray-600">{resp.data.phoneNumber || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{resp.data.ward || '-'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-500">{resp.personalCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{resp.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SurveyDetailPage
