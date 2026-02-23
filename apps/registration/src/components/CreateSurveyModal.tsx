import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CreateSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (title: string, description: string) => Promise<void>
}

function CreateSurveyModal({ isOpen, onClose, onCreate }: CreateSurveyModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsCreating(true)
    try {
      await onCreate(title.trim(), description.trim())
      setTitle('')
      setDescription('')
      onClose()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('survey.create.title')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('survey.create.titleLabel')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('survey.create.descriptionLabel')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('common.cancel')}</button>
            <button type="submit" disabled={isCreating || !title.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {isCreating ? t('survey.create.creating') : t('survey.create.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSurveyModal
