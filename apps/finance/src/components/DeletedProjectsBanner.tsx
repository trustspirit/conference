import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from 'trust-ui-react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { effectiveSystemRole } from '../hooks/useProjectRole'
import { useDeletedProjects, useRestoreProject } from '../hooks/queries/useProjects'
import { queryKeys } from '../hooks/queries/queryKeys'
import { getRemainingDeletionDays } from '../lib/projectDeletion'
import type { Project } from '../types'

/** 삭제 대기 중(30일 유예)인 대회를 알리고 복원할 수 있게 하는 배너. admin 전용. */
export default function DeletedProjectsBanner({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { setCurrentProject } = useProject()
  const queryClient = useQueryClient()
  const sys = effectiveSystemRole(appUser)
  const isAdmin = sys === 'admin' || sys === 'super_admin'
  const { data: deleted = [] } = useDeletedProjects({ enabled: isAdmin })
  const restore = useRestoreProject()

  // Same visibility rule as the "recently deleted" list in ProjectSelector.
  const visible =
    sys === 'super_admin'
      ? deleted
      : deleted.filter((p) => p.memberRoles?.[appUser?.uid ?? ''] === 'admin')

  if (!isAdmin || visible.length === 0) return null

  const handleRestore = async (projectId: string) => {
    try {
      await restore.mutateAsync(projectId)
      await queryClient.refetchQueries({ queryKey: queryKeys.projects.root() })
      setCurrentProject({ id: projectId } as Project)
    } catch {
      toast({ variant: 'danger', message: t('project.restoreFailed') })
    }
  }

  return (
    <div
      role="status"
      className={`rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800 ${className}`}
    >
      <p className="font-medium">{t('project.deletedBannerTitle')}</p>
      <ul className="mt-1 space-y-1">
        {visible.map((p) => {
          const days = getRemainingDeletionDays(p.deletedAt)
          return (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                {p.name}
                <span className="ml-2 text-xs text-orange-700">
                  {days > 0
                    ? t('project.autoDeleteDays', { days })
                    : t('project.autoDeletePending')}
                </span>
              </span>
              <button
                onClick={() => handleRestore(p.id)}
                disabled={restore.isPending}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-finance-primary hover:underline disabled:opacity-50"
              >
                {t('project.restore')}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-xs text-orange-700">{t('project.deletedBannerHint')}</p>
    </div>
  )
}
