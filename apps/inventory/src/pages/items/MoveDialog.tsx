import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Project } from '../../types'

interface Props {
  selectedCount: number
  allProjects: Project[]
  currentProjectId: string | undefined
  onClose: () => void
  onMove: (targetProjectId: string) => void
}

export function MoveDialog({
  selectedCount,
  allProjects,
  currentProjectId,
  onClose,
  onMove
}: Props) {
  const { t } = useTranslation()
  const [moveTargetProject, setMoveTargetProject] = useState('')

  const handleMove = () => {
    if (moveTargetProject) {
      onMove(moveTargetProject)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-gray-900">{t('items.moveToProject')}</h3>
        <p className="mb-4 text-sm text-gray-500">
          {t('items.selectedCount', { count: selectedCount })}
        </p>
        <select
          value={moveTargetProject}
          onChange={(e) => setMoveTargetProject(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">{t('items.moveToProject')}</option>
          {allProjects
            .filter((p) => p.id !== currentProjectId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('items.cancel')}
          </button>
          <button
            onClick={handleMove}
            disabled={!moveTargetProject}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {t('items.assignToProject')}
          </button>
        </div>
      </div>
    </div>
  )
}
