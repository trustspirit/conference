import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAtomValue } from 'jotai'
import { getUsers, setUserRole, removeUserRole, type AppUser, type UserRole } from '../services/firebase'
import { userRoleAtom } from '../stores/authStore'
import { Navigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ui'

function AdminManagePage(): React.ReactElement {
  const { t } = useTranslation()
  const userRole = useAtomValue(userRoleAtom)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingUid, setUpdatingUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{
    open: boolean
    uid: string
    email: string
  }>({ open: false, uid: '', email: '' })

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const list = await getUsers()
      setUsers(list.sort((a, b) => (a.email || '').localeCompare(b.email || '')))
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

  const handleSetRole = async (uid: string, role: UserRole) => {
    try {
      setUpdatingUid(uid)
      setError(null)
      await setUserRole(uid, role)
      await loadUsers()
    } catch (err) {
      console.error('Failed to set role:', err)
      setError(t('admin.addFailed'))
    } finally {
      setUpdatingUid(null)
    }
  }

  const handleRemoveRole = (uid: string, email: string) => {
    setRemoveConfirm({ open: true, uid, email })
  }

  const confirmRemoveRole = async () => {
    const { uid } = removeConfirm
    try {
      setUpdatingUid(uid)
      setError(null)
      await removeUserRole(uid)
      await loadUsers()
    } catch (err) {
      console.error('Failed to remove role:', err)
      setError(err instanceof Error ? err.message : t('admin.removeFailed'))
    } finally {
      setUpdatingUid(null)
    }
  }

  const admins = users.filter((u) => u.role === 'admin')
  const staff = users.filter((u) => u.role === 'staff')
  const noRole = users.filter((u) => !u.role)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#050505]">{t('admin.title')}</h1>
        <p className="text-[#65676B] mt-1">{t('admin.subtitle')}</p>
      </div>

      {error && (
        <div className="bg-[#FFEBEE] text-[#FA383E] p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

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
          <UserList
            users={admins}
            updatingUid={updatingUid}
            onRemoveRole={handleRemoveRole}
            t={t}
          />
        )}
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow-sm border border-[#DADDE1] mb-6">
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
          <UserList
            users={staff}
            updatingUid={updatingUid}
            onRemoveRole={handleRemoveRole}
            t={t}
          />
        )}
      </div>

      {/* Users without role */}
      <div className="bg-white rounded-lg shadow-sm border border-[#DADDE1]">
        <div className="px-6 py-4 border-b border-[#DADDE1]">
          <h2 className="text-lg font-semibold text-[#050505]">
            {t('admin.noRoleUsers', '권한 없음')}
            {!loading && (
              <span className="ml-2 text-sm font-normal text-[#65676B]">
                ({noRole.length})
              </span>
            )}
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin mx-auto" />
          </div>
        ) : noRole.length === 0 ? (
          <div className="p-8 text-center text-[#65676B]">
            <p className="font-medium">{t('admin.allAssigned', '모든 사용자에게 권한이 부여되어 있습니다.')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#DADDE1]">
            {noRole.map((user) => (
              <li key={user.uid} className="px-6 py-4 flex items-center justify-between hover:bg-[#F7F8FA] transition-colors">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#E4E6EB] flex items-center justify-center text-sm font-medium text-[#65676B]">
                      {(user.name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[#050505] font-medium text-sm">{user.name || user.email}</p>
                    {user.name && <p className="text-[#65676B] text-xs">{user.email}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetRole(user.uid, 'staff')}
                    disabled={updatingUid === user.uid}
                    className="px-3 py-1.5 text-[#1877F2] hover:bg-[#E7F3FF] rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {t('admin.roleStaff')}
                  </button>
                  <button
                    onClick={() => handleSetRole(user.uid, 'admin')}
                    disabled={updatingUid === user.uid}
                    className="px-3 py-1.5 text-[#E65100] hover:bg-[#FFF3E0] rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {t('admin.roleAdmin')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={removeConfirm.open}
        onClose={() => setRemoveConfirm({ open: false, uid: '', email: '' })}
        onConfirm={confirmRemoveRole}
        title={t('common.remove')}
        description={t('admin.confirmRemove', { email: removeConfirm.email })}
        variant="danger"
      />
    </div>
  )
}

function UserList({
  users,
  updatingUid,
  onRemoveRole,
  t,
}: {
  users: AppUser[]
  updatingUid: string | null
  onRemoveRole: (uid: string, email: string) => void
  t: (key: string, options?: Record<string, string>) => string
}) {
  return (
    <ul className="divide-y divide-[#DADDE1]">
      {users.map((user) => (
        <li key={user.uid} className="px-6 py-4 flex items-center justify-between hover:bg-[#F7F8FA] transition-colors">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#E4E6EB] flex items-center justify-center text-sm font-medium text-[#65676B]">
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[#050505] font-medium text-sm">{user.name || user.email}</p>
              {user.name && <p className="text-[#65676B] text-xs">{user.email}</p>}
            </div>
          </div>
          <button
            onClick={() => onRemoveRole(user.uid, user.email)}
            disabled={updatingUid === user.uid}
            className="px-3 py-1.5 text-[#FA383E] hover:bg-[#FFEBEE] rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {updatingUid === user.uid ? t('common.removing') : t('common.remove')}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default AdminManagePage
