import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '../../stores/authStore'
import { getAllSurveys, createSurvey, deleteSurvey, updateSurvey } from '../../services/surveys'
import { signOut } from '../../services/firebase'
import CreateSurveyModal from '../../components/CreateSurveyModal'
import type { Survey } from '../../types'

function SurveyListPage(): React.ReactElement {
  const user = useAtomValue(authUserAtom)
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
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this survey?')) return
    await deleteSurvey(id)
    await loadSurveys()
  }

  const copyLink = (survey: Survey) => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${survey.id}?token=${survey.shareToken}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600">Registration Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-gray-500 hover:text-gray-700">Sign Out</button>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Surveys</h2>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">+ New Survey</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No surveys yet. Create one to get started.</div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex-1">
                  <Link to={`/admin/survey/${survey.id}`} className="font-semibold text-gray-900 hover:text-blue-600">{survey.title}</Link>
                  <p className="text-sm text-gray-500 mt-1">{survey.isActive ? 'Active' : 'Inactive'} · {survey.createdAt.toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyLink(survey)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Copy Link</button>
                  <button onClick={() => handleToggleActive(survey)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">{survey.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => handleDelete(survey.id)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">Delete</button>
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
