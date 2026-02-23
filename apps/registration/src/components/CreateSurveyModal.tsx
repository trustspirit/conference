import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Textarea, Label } from './ui'

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
            <Label>{t('survey.create.titleLabel')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>
          <div>
            <Label>{t('survey.create.descriptionLabel')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isCreating || !title.trim()}>
              {isCreating ? t('survey.create.creating') : t('survey.create.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSurveyModal
