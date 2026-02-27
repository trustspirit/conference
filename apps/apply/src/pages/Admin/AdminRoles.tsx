import { useTranslation } from 'react-i18next'
import { useUsers, useUpdateUserRole, useUpdateLeaderStatus, useDeleteUser } from '../../hooks/queries/useUsers'
import { Select } from '../../components/form'
import Spinner from '../../components/Spinner'
import type { UserRole, LeaderStatus } from '../../types'

const ROLES: UserRole[] = ['applicant', 'bishop', 'stake_president', 'session_leader', 'admin']

export default function AdminRoles() {
  const { t } = useTranslation()
  const { data: users, isLoading } = useUsers()
  const updateRole = useUpdateUserRole()
  const updateLeaderStatus = useUpdateLeaderStatus()
  const deleteUser = useDeleteUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const handleRoleChange = (uid: string, role: UserRole) => {
    if (!confirm(t('admin.confirmRoleChange', `Change role to ${role}?`))) return
    updateRole.mutate({ uid, role })
  }

  const handleLeaderStatusChange = (uid: string, leaderStatus: LeaderStatus) => {
    updateLeaderStatus.mutate({ uid, leaderStatus })
  }

  const handleDeleteUser = (uid: string, name: string) => {
    if (confirm(t('admin.confirmDelete', { name }))) {
      deleteUser.mutate(uid)
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('admin.manageRoles', 'Manage Roles')}</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.name', 'Name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.email', 'Email')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.role', 'Role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status', 'Status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users?.map((user) => (
              <tr key={user.uid}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select
                    value={user.role || ''}
                    onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                    style={{ width: 'auto', fontSize: '0.875rem', padding: '0.25rem 1.75rem 0.25rem 0.5rem' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.leaderStatus === 'pending' && (
                    <button
                      onClick={() => handleLeaderStatusChange(user.uid, 'approved')}
                      className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      {t('admin.approveLeader', 'Approve Leader')}
                    </button>
                  )}
                  {user.leaderStatus === 'approved' && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {t('common.approved', 'Approved')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDeleteUser(user.uid, user.name)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
