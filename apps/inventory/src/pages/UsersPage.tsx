import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useUsers, useUpdateUserRole, useUpdateUserProjects } from '../hooks/queries/useUsers'
import { useProjects } from '../hooks/queries/useProjects'
import { AppUser, UserRole } from '../types'
import Spinner from '../components/Spinner'

const ROLES: UserRole[] = ['admin', 'writer', 'viewer']

export default function UsersPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: users = [], isLoading } = useUsers()
  const { data: projects = [] } = useProjects()
  const updateRole = useUpdateUserRole()
  const updateProjects = useUpdateUserProjects()
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])

  const handleRoleChange = (uid: string, role: UserRole) => {
    updateRole.mutate(
      { uid, role },
      { onSuccess: () => toast({ variant: 'success', message: t('users.userUpdated') }) }
    )
  }

  const openProjectEditor = (user: AppUser) => {
    setEditingUser(user)
    setSelectedProjects(user.projectIds || [])
  }

  const toggleProject = (pid: string) => {
    setSelectedProjects((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    )
  }

  const saveProjects = () => {
    if (!editingUser) return
    updateProjects.mutate(
      { uid: editingUser.uid, projectIds: selectedProjects },
      {
        onSuccess: () => {
          toast({ variant: 'success', message: t('users.userUpdated') })
          setEditingUser(null)
        }
      }
    )
  }

  if (isLoading) return <Spinner />

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('users.title')}</h1>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 font-semibold text-gray-600">{t('users.name')}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t('users.email')}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">{t('users.role')}</th>
              <th className="px-4 py-3 font-semibold text-gray-600">
                {t('users.assignedProjects')}
              </th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`users.${r}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.projectIds || []).map((pid) => {
                      const proj = projects.find((p) => p.id === pid)
                      return (
                        <span
                          key={pid}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {proj?.name || pid.slice(0, 6)}
                        </span>
                      )
                    })}
                    {(!u.projectIds || u.projectIds.length === 0) && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openProjectEditor(u)}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {t('users.assignProject')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-12 text-center text-sm text-gray-400">{t('users.noUsers')}</div>
        )}
      </div>

      {/* Project assignment dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">{t('users.assignProject')}</h3>
            <p className="mb-4 text-sm text-gray-500">
              {editingUser.name} ({editingUser.email})
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {projects.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(p.id)}
                    onChange={() => toggleProject(p.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{p.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('users.cancel')}
              </button>
              <button
                onClick={saveProjects}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('users.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
