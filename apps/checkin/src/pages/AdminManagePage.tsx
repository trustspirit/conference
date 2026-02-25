import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAtomValue } from 'jotai'
import { getAdmins, addUser, removeUser, type AdminEntry, type UserRole } from '../services/admins'
import { userRoleAtom } from '../stores/authStore'
import { Navigate } from 'react-router-dom'

function AdminManagePage(): React.ReactElement {
  const { t } = useTranslation()
  const userRole = useAtomValue(userRoleAtom)
  const [users, setUsers] = useState<AdminEntry[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('staff')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const list = await getAdmins()
      setUsers(list.sort((a, b) => a.email.localeCompare(b.email)))
    } catch (err) {
      console.error('Failed to load users:', err)
      setError(t('admin.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newEmail.trim()
    if (!trimmed) return

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('admin.invalidEmail'))
      return
    }

    if (users.some((a) => a.email.toLowerCase() === trimmed.toLowerCase())) {
      setError(t('admin.duplicateEmail'))
      return
    }

    try {
      setAdding(true)
      setError(null)
      await addUser(trimmed, newRole)
      setNewEmail('')
      await loadUsers()
    } catch (err) {
      console.error('Failed to add user:', err)
      setError(t('admin.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (email: string) => {
    if (!confirm(t('admin.confirmRemove', { email }))) return

    try {
      setRemovingEmail(email)
      setError(null)
      await removeUser(email)
      await loadUsers()
    } catch (err) {
      console.error('Failed to remove user:', err)
      setError(err instanceof Error ? err.message : t('admin.removeFailed'))
    } finally {
      setRemovingEmail(null)
    }
  }

  const admins = users.filter((u) => u.role === 'admin')
  const staff = users.filter((u) => u.role === 'staff')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#050505]">{t('admin.title')}</h1>
        <p className="text-[#65676B] mt-1">{t('admin.subtitle')}</p>
      </div>

      {/* Add User Form */}
      <div className="bg-white rounded-lg shadow-sm border border-[#DADDE1] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#050505] mb-4">{t('admin.addUser')}</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value)
              setError(null)
            }}
            placeholder={t('admin.emailPlaceholder')}
            className="flex-1 px-4 py-2.5 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
            disabled={adding}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            className="px-3 py-2.5 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors bg-white"
            disabled={adding}
          >
            <option value="staff">{t('admin.roleStaff')}</option>
            <option value="admin">{t('admin.roleAdmin')}</option>
          </select>
          <button
            type="submit"
            disabled={adding || !newEmail.trim()}
            className="px-6 py-2.5 bg-[#1877F2] text-white rounded-lg font-medium text-sm hover:bg-[#166FE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {adding ? t('admin.adding') : t('common.add')}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-[#FA383E]">{error}</p>
        )}
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-lg shadow-sm border border-[#DADDE1] mb-6">
        <div className="px-6 py-4 border-b border-[#DADDE1]">
          <h2 className="text-lg font-semibold text-[#050505]">
            {t('admin.roleAdmin')}
            {!loading && (
              <span className="ml-2 text-sm font-normal text-[#65676B]">
                ({admins.length})
              </span>
            )}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin mx-auto" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-[#65676B]">
            <p className="font-medium">{t('admin.noAdmins')}</p>
          </div>
        ) : (
          <UserList users={admins} removingEmail={removingEmail} onRemove={handleRemove} t={t} />
        )}
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow-sm border border-[#DADDE1]">
        <div className="px-6 py-4 border-b border-[#DADDE1]">
          <h2 className="text-lg font-semibold text-[#050505]">
            {t('admin.roleStaff')}
            {!loading && (
              <span className="ml-2 text-sm font-normal text-[#65676B]">
                ({staff.length})
              </span>
            )}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin mx-auto" />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-[#65676B]">
            <p className="font-medium">{t('admin.noStaff')}</p>
            <p className="text-sm mt-1">{t('admin.noStaffDesc')}</p>
          </div>
        ) : (
          <UserList users={staff} removingEmail={removingEmail} onRemove={handleRemove} t={t} />
        )}
      </div>
    </div>
  )
}

function UserList({
  users,
  removingEmail,
  onRemove,
  t,
}: {
  users: AdminEntry[]
  removingEmail: string | null
  onRemove: (email: string) => void
  t: (key: string, options?: Record<string, string>) => string
}) {
  return (
    <ul className="divide-y divide-[#DADDE1]">
      {users.map((user) => (
        <li key={user.email} className="px-6 py-4 flex items-center justify-between hover:bg-[#F7F8FA] transition-colors">
          <div>
            <p className="text-[#050505] font-medium text-sm">{user.email}</p>
            <p className="text-[#65676B] text-xs mt-0.5">
              {t('admin.addedAt', { date: user.addedAt.toLocaleDateString() })}
            </p>
          </div>
          <button
            onClick={() => onRemove(user.email)}
            disabled={removingEmail === user.email}
            className="px-3 py-1.5 text-[#FA383E] hover:bg-[#FFEBEE] rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {removingEmail === user.email ? t('common.removing') : t('common.remove')}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default AdminManagePage
