import { Button, TextField } from 'trust-ui-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Project } from '../../types'
import { useCreateProject } from '../../hooks/queries/useProjects'

export default function ProjectCreateForm({
  onCreated,
  onCancel
}: {
  onCreated: (id: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const createProject = useCreateProject()

  const handleCreate = async () => {
    if (!name.trim() || !appUser) return
    setSaving(true)
    setError('')
    try {
      const newDocRef = doc(collection(db, 'projects'))
      await createProject.mutateAsync({
        projectId: newDocRef.id,
        project: {
          name: name.trim(),
          description: desc.trim(),
          createdAt: serverTimestamp(),
          createdBy: {
            uid: appUser.uid,
            name: appUser.displayName || appUser.name,
            email: appUser.email
          },
          budgetConfig: { totalBudget: 0, byCode: {} },
          documentNo: '',
          directorApprovalThreshold: 600000,
          budgetWarningThreshold: 85,
          memberRoles: { [appUser.uid]: 'admin' as const },
          isActive: true
        } as unknown as Omit<Project, 'id'>
      })
      onCreated(newDocRef.id)
    } catch (err) {
      console.error('Failed to create project:', err)
      setError(t('project.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <TextField
        size="sm"
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('project.name')}
        autoFocus
      />
      <TextField
        size="sm"
        fullWidth
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder={t('project.description')}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreate}
          disabled={saving || !name.trim()}
        >
          {saving ? t('common.saving') : t('project.create')}
        </Button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-sm text-finance-muted hover:text-finance-primary"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
