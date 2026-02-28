import { useTranslation } from 'react-i18next'
import { useUsers, useUpdateUserRole, useUpdateLeaderStatus, useDeleteUser } from '../../hooks/queries/useUsers'
import { useToast, Select, Badge, Button, Dialog, Avatar, Switch } from 'trust-ui-react'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/Spinner'
import { getRoleTone } from '../../utils/constants'
import { ROLE_LABELS, sortByRole } from '../../utils/roleConfig'
import type { UserRole, LeaderStatus, AppUser } from '../../types'
import { isLeaderRole } from '../../lib/roles'
import { useMemo, useState } from 'react'

const ROLES: UserRole[] = ['applicant', 'bishop', 'stake_president', 'session_leader', 'admin']

function formatUserName(user: AppUser): string {
  const preferred = user.preferredName?.trim()
  if (!preferred || preferred === user.name) return user.name
  return `${user.name} (${preferred})`
}

const TONE_TO_BADGE: Record<string, 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'> = {
  admin: 'primary',
  sessionLeader: 'info',
  stakePresident: 'success',
  bishop: 'secondary',
  applicant: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  draft: 'secondary',
  submitted: 'info',
  awaiting: 'warning',
}

export default function AdminRoles() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const updateRole = useUpdateUserRole()
  const updateLeaderStatus = useUpdateLeaderStatus()
  const deleteUser = useDeleteUser()

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: '', message: '', onConfirm: () => {},
  })

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

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm })
  }

  const closeConfirm = () => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: () => {} })
  }

  const handleRoleChange = (uid: string, newRole: string | string[]) => {
    const role = newRole as UserRole
    const roleLabel = t(ROLE_LABELS[role])
    openConfirm(
      t('common.confirm'),
      `${t('common.confirm')}: ${roleLabel}?`,
      () => {
        updateRole.mutate({ uid, role }, {
          onSuccess: () => toast({ variant: 'success', message: `${roleLabel} ${t('common.approved', '완료')}` }),
          onError: () => toast({ variant: 'danger', message: t('errors.generic') }),
        })
        closeConfirm()
      },
    )
  }

  const handleLeaderStatusToggle = (uid: string, current: LeaderStatus | null) => {
    const next: LeaderStatus = current === 'approved' ? 'pending' : 'approved'
    updateLeaderStatus.mutate({ uid, leaderStatus: next }, {
      onSuccess: () => toast({ variant: 'success', message: next === 'approved' ? t('admin.roles.approved') : t('admin.roles.pending') }),
      onError: () => toast({ variant: 'danger', message: t('errors.generic') }),
    })
  }

  const handleDeleteUser = (uid: string, name: string) => {
    openConfirm(
      t('common.delete'),
      t('admin.confirmDelete', { name }),
      () => {
        deleteUser.mutate(uid, {
          onSuccess: () => toast({ variant: 'success', message: t('accountSettings.deleteUsers.deletedSingle', { userName: name }) }),
          onError: () => toast({ variant: 'danger', message: t('errors.generic') }),
        })
        closeConfirm()
      },
    )
  }

  const isSelf = (uid: string) => appUser?.uid === uid

  const roleOptions = ROLES.map((r) => ({ value: r, label: t(ROLE_LABELS[r]) }))

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
                    <Avatar src={user.picture} name={user.name || '?'} size="sm" />
                    <span className="text-sm text-gray-900">{formatUserName(user)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user.email}>{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isSelf(user.uid) ? (
                    <div className="flex items-center gap-2">
                      <Badge variant={TONE_TO_BADGE[getRoleTone(user.role)] || 'secondary'} size="sm">
                        {t(ROLE_LABELS[user.role!] || 'roles.applicant')}
                      </Badge>
                      <span className="text-xs text-gray-400">{t('admin.roles.cannotChangeRole', '자신의 역할은 변경 불가')}</span>
                    </div>
                  ) : (
                    <Select
                      options={roleOptions}
                      value={user.role || ''}
                      onChange={(value) => handleRoleChange(user.uid, value)}
                      style={{ width: 'auto', fontSize: '0.8125rem' }}
                    />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isLeaderRole(user.role) ? (
                    <Switch
                      checked={user.leaderStatus === 'approved'}
                      onChange={() => handleLeaderStatusToggle(user.uid, user.leaderStatus)}
                      disabled={isSelf(user.uid)}
                      label={user.leaderStatus === 'approved' ? t('admin.roles.approved', '승인됨') : t('admin.roles.pending', '대기 중')}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">{t('admin.roles.nA', 'N/A')}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {!isSelf(user.uid) && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.uid, user.name)}>
                      <span className="text-red-600">{t('common.delete', 'Delete')}</span>
                    </Button>
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
                <Avatar src={user.picture} name={user.name || '?'} size="sm" />
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{formatUserName(user)}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</p>
                </div>
              </div>
              <Badge variant={TONE_TO_BADGE[getRoleTone(user.role)] || 'secondary'} size="sm">
                {t(ROLE_LABELS[user.role!] || 'roles.applicant')}
              </Badge>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isSelf(user.uid) && (
                <Select
                  options={roleOptions}
                  value={user.role || ''}
                  onChange={(value) => handleRoleChange(user.uid, value)}
                  style={{ width: 'auto', fontSize: '0.75rem' }}
                />
              )}
              {isLeaderRole(user.role) && !isSelf(user.uid) && (
                <Switch
                  checked={user.leaderStatus === 'approved'}
                  onChange={() => handleLeaderStatusToggle(user.uid, user.leaderStatus)}
                  label={user.leaderStatus === 'approved' ? t('admin.roles.approved', '승인됨') : t('admin.roles.pending', '대기 중')}
                  size="sm"
                />
              )}
              {!isSelf(user.uid) && (
                <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.uid, user.name)}>
                  <span className="text-red-600">{t('common.delete', 'Delete')}</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirm} size="sm">
        <Dialog.Title onClose={closeConfirm}>{confirmDialog.title}</Dialog.Title>
        <Dialog.Content>
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>{confirmDialog.message}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={closeConfirm}>{t('common.cancel', '취소')}</Button>
          <Button variant="primary" onClick={confirmDialog.onConfirm}>{t('common.confirm', '확인')}</Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  )
}
