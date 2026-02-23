import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAtomValue, useSetAtom } from 'jotai'
import { authUserAtom } from '../../stores/authStore'
import { addToastAtom } from '../../stores/toastStore'
import { getAllSurveys, createSurvey, deleteSurvey, updateSurvey } from '../../services/surveys'
import { signOut } from '../../services/firebase'
import CreateSurveyModal from '../../components/CreateSurveyModal'
import type { Survey } from '../../types'

function SurveyListPage(): React.ReactElement {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)
  const addToast = useSetAtom(addToastAtom)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const loadSurveys = async () => {
    try {
      const data = await getAllSurveys()
      setSurveys(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSurveys() }, [])

  const handleCreate = async (title: string, description: string) => {
    await createSurvey(title, description, user?.displayName || user?.email || '')
    await loadSurveys()
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
      <nav className="bg-white shadow-sm px-6 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600">{t('admin.title')}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-gray-500 hover:text-gray-700">{t('common.signOut')}</button>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('survey.title')}</h2>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">{t('survey.newSurvey')}</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">{t('survey.noSurveys')}</div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex-1">
                  <Link to={`/admin/survey/${survey.id}`} className="font-semibold text-gray-900 hover:text-blue-600">{survey.title}</Link>
                  <p className="text-sm text-gray-500 mt-1">{survey.isActive ? t('common.active') : t('common.inactive')} · {survey.createdAt.toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyLink(survey)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">{t('survey.copyLink')}</button>
                  <button onClick={() => handleToggleActive(survey)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">{survey.isActive ? t('survey.deactivate') : t('survey.activate')}</button>
                  <button onClick={() => handleDelete(survey.id)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">{t('common.delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <CreateSurveyModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      </main>
    </div>
  )
}

export default SurveyListPage
