import { useTranslation } from 'react-i18next'
import { useUsers, useUpdateUserRole, useUpdateLeaderStatus, useDeleteUser } from '../../hooks/queries/useUsers'
import { useAuth } from '../../contexts/AuthContext'
import { Select } from '../../components/form'
import Spinner from '../../components/Spinner'
import StatusChip from '../../components/StatusChip'
import { getRoleTone } from '../../utils/constants'
import { ROLE_LABELS, sortByRole } from '../../utils/roleConfig'
import type { UserRole, LeaderStatus } from '../../types'
import { isLeaderRole } from '../../lib/roles'
import { useMemo } from 'react'

const ROLES: UserRole[] = ['applicant', 'bishop', 'stake_president', 'session_leader', 'admin']

export default function AdminRoles() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const updateRole = useUpdateUserRole()
  const updateLeaderStatus = useUpdateLeaderStatus()
  const deleteUser = useDeleteUser()

  const sortedUsers = useMemo(() => {
    if (!users) return []
    return sortByRole(users)
  }, [users])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const handleRoleChange = (uid: string, role: UserRole) => {
    if (!confirm(t('admin.roles.approveLeader', `Change role to ${role}?`))) return
    updateRole.mutate({ uid, role })
  }

  const handleLeaderStatusToggle = (uid: string, current: LeaderStatus | null) => {
    const next: LeaderStatus = current === 'approved' ? 'pending' : 'approved'
    updateLeaderStatus.mutate({ uid, leaderStatus: next })
  }

  const handleDeleteUser = (uid: string, name: string) => {
    if (confirm(t('admin.confirmDelete', { name }))) {
      deleteUser.mutate(uid)
    }
  }

  const isSelf = (uid: string) => appUser?.uid === uid

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('admin.roles.title', '역할 관리')}</h1>
      <p className="text-sm text-gray-500 mb-6">{t('admin.roles.subtitle', '사용자 역할 및 권한을 관리합니다.')}</p>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.roles.columns.name', 'Name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.roles.columns.email', 'Email')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.roles.columns.role', 'Role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.roles.columns.leaderApproval', 'Leader Approval')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr key={user.uid}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {user.picture ? (
                      <img src={user.picture} alt="" style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px' }} />
                    ) : (
                      <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '9999px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 600, color: '#6b7280' }}>
                        {(user.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isSelf(user.uid) ? (
                    <div className="flex items-center gap-2">
                      <StatusChip label={t(ROLE_LABELS[user.role!] || 'roles.applicant')} tone={getRoleTone(user.role)} />
                      <span className="text-xs text-gray-400">{t('admin.roles.cannotChangeRole', '자신의 역할은 변경 불가')}</span>
                    </div>
                  ) : (
                    <Select
                      value={user.role || ''}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      style={{ width: 'auto', fontSize: '0.8125rem', padding: '0.25rem 1.75rem 0.25rem 0.5rem' }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(ROLE_LABELS[r])}
                        </option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isLeaderRole(user.role) ? (
                    <button
                      onClick={() => handleLeaderStatusToggle(user.uid, user.leaderStatus)}
                      disabled={isSelf(user.uid)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: isSelf(user.uid) ? 'not-allowed' : 'pointer',
                        opacity: isSelf(user.uid) ? 0.5 : 1,
                        borderColor: user.leaderStatus === 'approved' ? '#86efac' : '#fde68a',
                        backgroundColor: user.leaderStatus === 'approved' ? '#f0fdf4' : '#fffbeb',
                        color: user.leaderStatus === 'approved' ? '#166534' : '#92400e',
                      }}
                    >
                      {user.leaderStatus === 'approved' ? t('admin.roles.approved', '승인됨') : t('admin.roles.pending', '대기 중')}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">{t('admin.roles.nA', 'N/A')}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {!isSelf(user.uid) && (
                    <button
                      onClick={() => handleDeleteUser(user.uid, user.name)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedUsers.map((user) => (
          <div
            key={user.uid}
            style={{
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              backgroundColor: '#fff',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {user.picture ? (
                  <img src={user.picture} alt="" style={{ width: '2rem', height: '2rem', borderRadius: '9999px' }} />
                ) : (
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                    {(user.name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{user.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</p>
                </div>
              </div>
              <StatusChip label={t(ROLE_LABELS[user.role!] || 'roles.applicant')} tone={getRoleTone(user.role)} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isSelf(user.uid) && (
                <Select
                  value={user.role || ''}
                  onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                  style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 1.5rem 0.25rem 0.5rem' }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{t(ROLE_LABELS[r])}</option>
                  ))}
                </Select>
              )}
              {isLeaderRole(user.role) && !isSelf(user.uid) && (
                <button
                  onClick={() => handleLeaderStatusToggle(user.uid, user.leaderStatus)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderColor: user.leaderStatus === 'approved' ? '#86efac' : '#fde68a',
                    backgroundColor: user.leaderStatus === 'approved' ? '#f0fdf4' : '#fffbeb',
                    color: user.leaderStatus === 'approved' ? '#166534' : '#92400e',
                  }}
                >
                  {user.leaderStatus === 'approved' ? t('admin.roles.approved', '승인됨') : t('admin.roles.pending', '대기 중')}
                </button>
              )}
              {!isSelf(user.uid) && (
                <button
                  onClick={() => handleDeleteUser(user.uid, user.name)}
                  style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('common.delete', 'Delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
