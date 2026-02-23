import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Project } from '../../types'
import { useInfiniteUsers } from '../../hooks/queries/useUsers'
import { useUpdateProjectMembers } from '../../hooks/queries/useProjects'
import InfiniteScrollSentinel from '../InfiniteScrollSentinel'

export default function MemberManagement({ project }: { project: Project }) {
  const { t } = useTranslation()
  const {
    data: usersData,
    isLoading: usersLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteUsers()
  const users = usersData?.pages.flatMap(p => p.items) ?? []
  const updateMembersMutation = useUpdateProjectMembers()
  const membersContainerRef = useRef<HTMLDivElement>(null)

  const memberUids = new Set(project.memberUids || [])

  const handleToggle = async (uid: string, add: boolean) => {
    try {
      await updateMembersMutation.mutateAsync({
        projectId: project.id,
        addUids: add ? [uid] : [],
        removeUids: add ? [] : [uid],
        currentMemberUids: project.memberUids || [],
      })
    } catch (err) { console.error('Failed to toggle member:', err) }
  }

  if (usersLoading) return <p className="text-sm text-gray-500">{t('common.loading')}</p>

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {t('project.memberCount', { count: memberUids.size })}
      </p>
      <div ref={membersContainerRef} className="max-h-80 overflow-y-auto space-y-1">
        {users.map(u => (
          <label key={u.uid} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded">
            <input
              type="checkbox"
              checked={memberUids.has(u.uid)}
              onChange={(e) => handleToggle(u.uid, e.target.checked)}
            />
            <span className="font-medium">{u.displayName || u.name}</span>
            <span className="text-xs text-gray-400">{u.email}</span>
          </label>
        ))}
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          rootRef={membersContainerRef}
        />
      </div>
    </div>
  )
}
