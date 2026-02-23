import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAtomValue, useSetAtom } from 'jotai'
import { authUserAtom } from '../../stores/authStore'
import { addToastAtom } from '../../stores/toastStore'
import { getAllSurveys, createSurvey, deleteSurvey, updateSurvey } from '../../services/surveys'
import { getDefaultFields } from '../../services/surveyDefaults'
import { Button, Spinner } from '../../components/ui'
import AdminNavbar from '../../components/admin/AdminNavbar'
import SurveyCard from '../../components/admin/SurveyCard'
import type { Survey } from '../../types'

function SurveyListPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)
  const addToast = useSetAtom(addToastAtom)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadSurveys = async () => {
    try {
      const data = await getAllSurveys()
      setSurveys(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSurveys() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const survey = await createSurvey(
        t('builder.untitledSurvey'),
        '',
        user?.displayName || user?.email || '',
        getDefaultFields(t)
      )
      navigate(`/admin/survey/${survey.id}/edit`)
    } catch {
      addToast({ message: t('builder.createFailed'), type: 'error' })
      setCreating(false)
    }
  }

  const handleToggleActive = async (survey: Survey) => {
    await updateSurvey(survey.id, { isActive: !survey.isActive })
    await loadSurveys()
    addToast({
      message: t(survey.isActive ? 'toast.surveyDeactivated' : 'toast.surveyActivated'),
      type: 'success',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('survey.deleteConfirm'))) return
    await deleteSurvey(id)
    await loadSurveys()
    addToast({ message: t('toast.surveyDeleted'), type: 'success' })
  }

  const copyLink = (survey: Survey) => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${survey.id}?token=${survey.shareToken}`)
    addToast({ message: t('toast.linkCopied'), type: 'success' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('survey.title')}</h2>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? t('survey.create.creating') : t('survey.newSurvey')}
          </Button>
        </div>
        {loading ? (
          <Spinner />
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">{t('survey.noSurveys')}</div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                onCopyLink={() => copyLink(survey)}
                onToggleActive={() => handleToggleActive(survey)}
                onDelete={() => handleDelete(survey.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default SurveyListPage
