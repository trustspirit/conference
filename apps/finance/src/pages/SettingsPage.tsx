import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../contexts/ProjectContext'
import Layout from '../components/Layout'
import { CheckIcon, StarIcon, TrashIcon } from '../components/Icons'
import { Dialog, Button } from 'trust-ui-react'
import ProjectGeneralSettings from '../components/settings/ProjectGeneralSettings'
import MemberManagement from '../components/settings/MemberManagement'
import { useGlobalSettings, useUpdateGlobalSettings } from '../hooks/queries/useSettings'
import { useSoftDeleteProject } from '../hooks/queries/useProjects'

function ProjectManagement() {
  const { t } = useTranslation()
  const { currentProject, projects, setCurrentProject } = useProject()
  const activeProjects = projects.filter((p) => p.isActive)
  const { data: globalSettings, isLoading: settingsLoading } = useGlobalSettings()
  const updateSettings = useUpdateGlobalSettings()
  const softDelete = useSoftDeleteProject()
  const defaultProjectId = globalSettings?.defaultProjectId || ''

  const [subTab, setSubTab] = useState<'general' | 'members'>('general')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    onConfirm: () => void
    message: string
  }>({ open: false, onConfirm: () => {}, message: '' })
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }))

  const selectedProject = currentProject || activeProjects[0]
  const effectiveId = selectedProject?.id || ''
  const isDefault = effectiveId === defaultProjectId

  const handleDelete = () => {
    if (!selectedProject) return
    setConfirmDialog({
      open: true,
      message: t('project.deleteConfirm', { name: selectedProject.name }),
      onConfirm: async () => {
        closeConfirm()
        await softDelete.mutateAsync(effectiveId)
        const remaining = activeProjects.filter((p) => p.id !== effectiveId)
        if (remaining.length > 0) setCurrentProject(remaining[0])
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Project Header */}
      {selectedProject && (
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
          <span className="min-w-0 break-words">{selectedProject.name}</span>
          {isDefault && (
            <span className="inline-flex items-center gap-1 text-xs bg-finance-success-bg text-finance-accent px-2 py-0.5 rounded-full">
              <CheckIcon className="w-3 h-3" />
              {t('project.isDefault')}
            </span>
          )}
        </div>
      )}

      {selectedProject ? (
        <>
          {/* Project actions */}
          {!settingsLoading && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {!isDefault && (
                  <button
                    onClick={() => updateSettings.mutateAsync({ defaultProjectId: effectiveId })}
                    className="inline-flex items-center gap-1 text-xs border border-finance-border text-finance-muted px-2.5 py-1 rounded hover:bg-finance-primary-subtle hover:text-finance-primary transition-colors"
                  >
                    <StarIcon className="w-3 h-3" />
                    {t('project.setDefault')}
                  </button>
                )}
              </div>
              {!isDefault && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  {t('common.delete')}
                </button>
              )}
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { key: 'general' as const, label: t('project.general') },
              { key: 'members' as const, label: t('project.members') }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSubTab(item.key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  subTab === item.key
                    ? 'finance-nav-active font-medium'
                    : 'text-finance-muted hover:bg-finance-primary-subtle hover:text-finance-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {subTab === 'general' ? (
            <ProjectGeneralSettings key={effectiveId} project={selectedProject} />
          ) : (
            <MemberManagement project={selectedProject} />
          )}
        </>
      ) : null}

      <Dialog open={confirmDialog.open} onClose={closeConfirm} size="sm">
        <Dialog.Title onClose={closeConfirm}>확인</Dialog.Title>
        <Dialog.Content>
          <p>{confirmDialog.message}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={closeConfirm}>
            취소
          </Button>
          <Button variant="danger" onClick={confirmDialog.onConfirm}>
            확인
          </Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <Layout>
      <div className="finance-panel rounded-lg p-4 max-w-lg mx-auto sm:p-6">
        <h2 className="text-xl font-bold text-finance-primary mb-6">{t('project.projectSettings')}</h2>
        <ProjectManagement />
      </div>
    </Layout>
  )
}
