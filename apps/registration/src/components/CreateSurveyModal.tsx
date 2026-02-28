import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextField, Dialog } from 'trust-ui-react'

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
    <Dialog open={isOpen} onClose={onClose} size="sm">
      <Dialog.Title onClose={onClose}>{t('survey.create.title')}</Dialog.Title>
      <Dialog.Content>
        <form id="create-survey-form" onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label={t('survey.create.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <TextField
            label={t('survey.create.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </form>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" form="create-survey-form" disabled={isCreating || !title.trim()} loading={isCreating}>
          {isCreating ? t('survey.create.creating') : t('survey.create.create')}
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

export default CreateSurveyModal
