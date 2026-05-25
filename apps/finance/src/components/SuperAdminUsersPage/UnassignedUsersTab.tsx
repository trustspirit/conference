import { useState } from 'react'
import { useUnassignedUsers } from '../../hooks/queries/useUnassignedUsers'
import { useProjects } from '../../hooks/queries/useProjects'
import { useUpdateProjectMemberRole } from '../../hooks/queries/useUsers'
import { useAuth } from '../../contexts/AuthContext'
import { ProjectRole } from '../../types'

const PROJECT_ROLES: ProjectRole[] = [
  'user', 'finance_ops', 'approver_ops', 'finance_prep',
  'approver_prep', 'session_director', 'logistic_admin', 'executive', 'admin'
]

export default function UnassignedUsersTab() {
  const { appUser } = useAuth()
  const { data: users = [], isLoading } = useUnassignedUsers()
  const { data: projects = [] } = useProjects(appUser)
  const updateRole = useUpdateProjectMemberRole()
  const [assignTo, setAssignTo] = useState<Record<string, { projectId: string; role: ProjectRole }>>({})

  if (isLoading) return <div>Loading…</div>
  if (users.length === 0) return <p className="text-gray-500">미할당 사용자가 없습니다.</p>

  return (
    <ul className="divide-y">
      {users.map((u) => {
        const sel = assignTo[u.uid] ?? { projectId: projects[0]?.id ?? '', role: 'user' as ProjectRole }
        return (
          <li key={u.uid} className="py-3 flex items-center gap-3">
            <div className="flex-1">
              <div>{u.displayName || u.name}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
            </div>
            <select value={sel.projectId} onChange={(e) => setAssignTo({ ...assignTo, [u.uid]: { ...sel, projectId: e.target.value } })}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={sel.role} onChange={(e) => setAssignTo({ ...assignTo, [u.uid]: { ...sel, role: e.target.value as ProjectRole } })}>
              {PROJECT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              disabled={updateRole.isPending || !sel.projectId}
              onClick={() => updateRole.mutate({ projectId: sel.projectId, uid: u.uid, role: sel.role })}
            >배정</button>
          </li>
        )
      })}
    </ul>
  )
}
