import { useMemo } from 'react'
import { useUsers, useUpdateSystemRole, useDeleteUser } from '../../hooks/queries/useUsers'
import { useProjects } from '../../hooks/queries/useProjects'
import { useAuth } from '../../contexts/AuthContext'
import { SystemRole } from '../../types'

export default function AllUsersTab() {
  const { appUser } = useAuth()
  const { data: users = [] } = useUsers()
  const { data: projects = [] } = useProjects(appUser)
  const updateSys = useUpdateSystemRole()
  const deleteUser = useDeleteUser()

  const projectsByUser = useMemo(() => {
    const map: Record<string, { projectName: string; role: string }[]> = {}
    for (const p of projects) {
      const roles = p.memberRoles ?? {}
      for (const [uid, r] of Object.entries(roles)) {
        if (!map[uid]) map[uid] = []
        map[uid].push({ projectName: p.name, role: r as string })
      }
    }
    return map
  }, [projects])

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b">
          <th className="py-2">Name</th>
          <th>Email</th>
          <th>System Role</th>
          <th>Projects</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.uid} className="border-b">
            <td className="py-2">{u.displayName || u.name}</td>
            <td>{u.email}</td>
            <td>
              <select
                value={u.systemRole ?? 'member'}
                disabled={u.systemRole === 'super_admin'}
                onChange={(e) => updateSys.mutate({ uid: u.uid, systemRole: e.target.value as SystemRole })}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </td>
            <td>
              {(projectsByUser[u.uid] ?? []).map((p) => (
                <span key={p.projectName} className="inline-block mr-2 text-xs">
                  {p.projectName} ({p.role})
                </span>
              ))}
            </td>
            <td>
              <button
                disabled={u.uid === appUser?.uid}
                onClick={() => {
                  if (window.confirm(`Delete ${u.email}?`)) {
                    deleteUser.mutate(u.uid)
                  }
                }}
              >삭제</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
