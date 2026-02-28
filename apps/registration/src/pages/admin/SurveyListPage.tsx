import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '../../stores/authStore'
import { useToast, Button, Dialog } from 'trust-ui-react'
import { getAllSurveys, createSurvey, deleteSurvey, updateSurvey } from '../../services/surveys'
import { getDefaultFields } from '../../services/surveyDefaults'
import Spinner from '../../components/ui/Spinner'
import AdminNavbar from '../../components/admin/AdminNavbar'
import SurveyCard from '../../components/admin/SurveyCard'
import DashboardOverview from '../../components/admin/DashboardOverview'
import { getAllResponses } from '../../services/responses'
import type { Survey, SurveyResponse } from '../../types'

function SurveyListPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)
  const { toast } = useToast()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [allResponses, setAllResponses] = useState<SurveyResponse[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadSurveys = async () => {
    try {
      const [data, responses] = await Promise.all([getAllSurveys(), getAllResponses()])
      setSurveys(data)
      setAllResponses(responses)
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
      toast({ message: t('builder.createFailed'), variant: 'danger' })
      setCreating(false)
    }
  }

  const handleToggleActive = async (survey: Survey) => {
    await updateSurvey(survey.id, { isActive: !survey.isActive })
    await loadSurveys()
    toast({
      message: t(survey.isActive ? 'toast.surveyDeactivated' : 'toast.surveyActivated'),
      variant: 'success',
    })
  }

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    const idToDelete = confirmDeleteId
    setConfirmDeleteId(null)
    await deleteSurvey(idToDelete)
    await loadSurveys()
    toast({ message: t('toast.surveyDeleted'), variant: 'success' })
  }

  const copyLink = (survey: Survey) => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${survey.id}?token=${survey.shareToken}`)
    toast({ message: t('toast.linkCopied'), variant: 'success' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('survey.title')}</h2>
          <Button onClick={handleCreate} disabled={creating} loading={creating}>
            {creating ? t('survey.create.creating') : t('survey.newSurvey')}
          </Button>
        </div>
        {!loading && surveys.length > 0 && (
          <DashboardOverview surveys={surveys} allResponses={allResponses} />
        )}
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

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} size="sm">
        <Dialog.Title onClose={() => setConfirmDeleteId(null)}>{t('common.confirm')}</Dialog.Title>
        <Dialog.Content>
          <p className="text-sm text-gray-700">{t('survey.deleteConfirm')}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={handleConfirmDelete}>{t('common.delete')}</Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  )
}

export default SurveyListPage
