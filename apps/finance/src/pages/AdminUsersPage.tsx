import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useInfiniteUsers, useUpdateUserRole, useDeleteUser } from '../hooks/queries/useUsers'
import { AppUser, UserRole } from '../types'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import InfiniteScrollSentinel from '../components/InfiniteScrollSentinel'
import { Select, Button, Dialog, useToast } from 'trust-ui-react'
import { TrashIcon } from '../components/Icons'
import ProcessingOverlay from '../components/ProcessingOverlay'
import BankBookPreview from '../components/BankBookPreview'
import FinanceTable from '../components/table/FinanceTable'

function BankInfoTooltip({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onClose])

  const bankBookImg = user.bankBookUrl || user.bankBookDriveUrl

  return (
    <div ref={ref} className="finance-panel z-50 rounded-lg p-4 w-72">
      <p className="text-xs font-medium text-gray-500 mb-1">{t('field.bankAndAccount')}</p>
      <p className="text-sm text-gray-900 mb-2">
        {user.bankName ? `${user.bankName} ${user.bankAccount}` : '-'}
      </p>
      <p className="text-xs font-medium text-gray-500 mb-1">{t('field.bankBook')}</p>
      {bankBookImg ? (
        <a
          href={user.bankBookUrl || user.bankBookDriveUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <BankBookPreview
            url={bankBookImg}
            alt={t('field.bankBook')}
            maxHeight="max-h-40"
            className="w-full object-contain bg-[#F8FAFC] rounded border border-[#D8DDE5]"
          />
        </a>
      ) : (
        <p className="text-xs text-gray-400">{t('settings.bankBookRequiredHint')}</p>
      )}
    </div>
  )
}

function UserNameWithTooltip({
  user,
  currentUser,
  isAdmin,
  roleLabel
}: {
  user: AppUser
  currentUser: AppUser | null
  isAdmin: boolean
  roleLabel: string
}) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false
  })

  const openTooltip = useCallback(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const tooltipHeight = 200
      const spaceBelow = window.innerHeight - rect.bottom
      const showAbove = spaceBelow < tooltipHeight && rect.top > tooltipHeight
      setTooltipPos({
        top: showAbove ? rect.top : rect.bottom,
        left: Math.min(rect.left, window.innerWidth - 300),
        above: showAbove
      })
    }
    setShowTooltip(true)
  }, [])

  return (
    <>
      <span
        ref={anchorRef}
        className="cursor-pointer hover:text-[#002C5F] underline decoration-dotted underline-offset-2"
        onMouseEnter={openTooltip}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={openTooltip}
      >
        {user.displayName || user.name || '-'}
      </span>
      {user.displayName && user.name && user.displayName !== user.name && (
        <span className="ml-1 text-xs text-gray-400">({user.name})</span>
      )}
      {user.uid === currentUser?.uid && (
        <span className="ml-2 text-xs text-[#002C5F]">{t('users.me')}</span>
      )}
      {!isAdmin && <span className="ml-2 text-xs text-gray-400">{roleLabel}</span>}
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            zIndex: 9999,
            transform: tooltipPos.above ? 'translateY(-100%) translateY(-4px)' : 'translateY(4px)'
          }}
        >
          <BankInfoTooltip user={user} onClose={() => setShowTooltip(false)} />
        </div>
      )}
    </>
  )
}

function MobileUserCard({
  user: u,
  currentUser,
  isAdmin,
  roleLabel,
  successUid,
  onRoleChange,
  onDelete
}: {
  user: AppUser
  currentUser: AppUser | null
  isAdmin: boolean
  roleLabel: string
  successUid: string | null
  onRoleChange: (uid: string, role: UserRole) => void
  onDelete: (uid: string) => void
}) {
  const { t } = useTranslation()
  const [showBank, setShowBank] = useState(false)
  const bankBookImg = u.bankBookUrl || u.bankBookDriveUrl

  return (
    <div className="finance-panel rounded-lg p-4">
      <div className="mb-3">
        <p className="font-medium text-gray-900">
          <span
            className="cursor-pointer underline decoration-dotted underline-offset-2 text-[#002C5F]"
            onClick={() => setShowBank((v) => !v)}
          >
            {u.displayName || u.name || '-'}
          </span>
          {u.displayName && u.name && u.displayName !== u.name && (
            <span className="ml-1 text-xs text-gray-400">({u.name})</span>
          )}
          {u.uid === currentUser?.uid && (
            <span className="ml-2 text-xs text-[#002C5F]">{t('users.me')}</span>
          )}
          {!isAdmin && <span className="ml-2 text-xs text-gray-400">{roleLabel}</span>}
        </p>
        <p className="text-sm text-gray-500 mt-1">{u.email}</p>
        <p className="text-sm text-gray-500">{u.phone || '-'}</p>
        {showBank && (
          <div className="mt-2 p-3 bg-[#F8FAFC] rounded-lg border border-[#D8DDE5]">
            <p className="text-xs font-medium text-gray-500 mb-1">{t('field.bankAndAccount')}</p>
            <p className="text-sm text-gray-900 mb-2">
              {u.bankName ? `${u.bankName} ${u.bankAccount}` : '-'}
            </p>
            <p className="text-xs font-medium text-gray-500 mb-1">{t('field.bankBook')}</p>
            {bankBookImg ? (
              <a href={bankBookImg} target="_blank" rel="noopener noreferrer">
                <BankBookPreview
                  url={bankBookImg}
                  alt={t('field.bankBook')}
                  maxHeight="max-h-40"
                  className="w-full object-contain bg-white rounded border border-[#D8DDE5]"
                />
              </a>
            ) : (
              <p className="text-xs text-gray-400">{t('settings.bankBookRequiredHint')}</p>
            )}
          </div>
        )}
      </div>
      {isAdmin ? (
        <div>
          {u.role === 'super_admin' ? (
            <span className="text-xs text-gray-400">{t('role.super_admin')}</span>
          ) : (
            <>
              <Select
                options={[
                  { value: 'user', label: t('role.user') },
                  { value: 'finance_ops', label: t('role.finance_ops') },
                  { value: 'approver_ops', label: t('role.approver_ops') },
                  { value: 'finance_prep', label: t('role.finance_prep') },
                  { value: 'approver_prep', label: t('role.approver_prep') },
                  { value: 'session_director', label: t('role.session_director') },
                  { value: 'logistic_admin', label: t('role.logistic_admin') },
                  { value: 'executive', label: t('role.executive') },
                  { value: 'admin', label: t('role.admin') }
                ]}
                value={u.role}
                disabled={u.uid === currentUser?.uid}
                onChange={(v) => onRoleChange(u.uid, v as UserRole)}
                fullWidth
              />
              {successUid === u.uid && (
                <p className="finance-success-text text-xs mt-1">{t('users.roleChanged')}</p>
              )}
            </>
          )}
          {u.uid !== currentUser?.uid && u.role !== 'super_admin' && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(u.uid)}>
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">{roleLabel}</p>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser: currentUser } = useAuth()
  const {
    data,
    isLoading: loading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useInfiniteUsers()
  const updateRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()
  const [successUid, setSuccessUid] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    onConfirm: () => void
    message: string
  }>({ open: false, onConfirm: () => {}, message: '' })
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }))

  const ROLE_PRIORITY: Record<UserRole, number> = {
    super_admin: -1,
    admin: 0,
    executive: 1,
    finance_prep: 2,
    session_director: 3,
    logistic_admin: 4,
    approver_ops: 5,
    approver_prep: 6,
    finance_ops: 7,
    user: 8
  }

  const users = (data?.pages.flatMap((p) => p.items) ?? []).slice().sort((a, b) => {
    const roleDiff = (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
    if (roleDiff !== 0) return roleDiff
    return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', 'ko')
  })

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'

  const ROLE_LABELS: Record<UserRole, string> = {
    user: t('role.user'),
    finance_ops: t('role.finance_ops'),
    approver_ops: t('role.approver_ops'),
    finance_prep: t('role.finance_prep'),
    approver_prep: t('role.approver_prep'),
    session_director: t('role.session_director'),
    logistic_admin: t('role.logistic_admin'),
    executive: t('role.executive'),
    admin: t('role.admin'),
    super_admin: t('role.super_admin')
  }

  const handleRoleChange = (uid: string, newRole: UserRole) => {
    if (uid === currentUser?.uid) {
      toast({ variant: 'danger', message: t('users.selfChangeError') })
      return
    }
    setConfirmDialog({
      open: true,
      message: t('users.roleChangeConfirm', { role: ROLE_LABELS[newRole] }),
      onConfirm: () => {
        closeConfirm()
        updateRole.mutate(
          { uid, role: newRole },
          {
            onSuccess: () => {
              setSuccessUid(uid)
              setTimeout(() => setSuccessUid(null), 2000)
            },
            onError: () => {
              toast({ variant: 'danger', message: t('users.roleChangeFailed') })
            }
          }
        )
      }
    })
  }

  const handleDeleteUser = (uid: string) => {
    if (uid === currentUser?.uid) return
    setConfirmDialog({
      open: true,
      message: t('users.deleteConfirm'),
      onConfirm: () => {
        closeConfirm()
        deleteUser.mutate(uid)
      }
    })
  }

  return (
    <Layout>
      <ProcessingOverlay open={deleteUser.isPending} text={t('users.deletingUser')} />
      <PageHeader title={t('users.title')} />
      {loading ? (
        <Spinner />
      ) : error ? (
        <p className="text-red-500 text-sm">{t('common.loadError')}</p>
      ) : users.length === 0 ? (
        <EmptyState title={t('users.noUsers')} />
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block">
            <FinanceTable>
              <FinanceTable.Head>
                <tr>
                  <FinanceTable.Th>{t('field.displayName')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.email')}</FinanceTable.Th>
                  <FinanceTable.Th>{t('field.phone')}</FinanceTable.Th>
                  {isAdmin && (
                    <FinanceTable.Th align="center" className="min-w-[180px]">
                      {t('role.label')}
                    </FinanceTable.Th>
                  )}
                  {isAdmin && <FinanceTable.Th align="center" className="w-16"></FinanceTable.Th>}
                </tr>
              </FinanceTable.Head>
              <FinanceTable.Body>
                {users.map((u) => (
                  <FinanceTable.Row key={u.uid}>
                    <FinanceTable.Td>
                      <UserNameWithTooltip
                        user={u}
                        currentUser={currentUser}
                        isAdmin={isAdmin}
                        roleLabel={ROLE_LABELS[u.role]}
                      />
                    </FinanceTable.Td>
                    <FinanceTable.Td className="text-gray-500">{u.email}</FinanceTable.Td>
                    <FinanceTable.Td className="text-gray-500">{u.phone || '-'}</FinanceTable.Td>
                    {isAdmin && (
                      <FinanceTable.Td align="center">
                        {u.role === 'super_admin' ? (
                          <span className="text-xs text-gray-400">{t('role.super_admin')}</span>
                        ) : (
                          <>
                            <Select
                              options={[
                                { value: 'user', label: t('role.user') },
                                { value: 'finance_ops', label: t('role.finance_ops') },
                                { value: 'approver_ops', label: t('role.approver_ops') },
                                { value: 'finance_prep', label: t('role.finance_prep') },
                                { value: 'approver_prep', label: t('role.approver_prep') },
                                { value: 'session_director', label: t('role.session_director') },
                                { value: 'logistic_admin', label: t('role.logistic_admin') },
                                { value: 'executive', label: t('role.executive') },
                                { value: 'admin', label: t('role.admin') }
                              ]}
                              value={u.role}
                              disabled={u.uid === currentUser?.uid}
                              onChange={(v) => handleRoleChange(u.uid, v as UserRole)}
                              fullWidth
                            />
                            {successUid === u.uid && (
                              <p className="finance-success-text text-xs mt-1">
                                {t('users.roleChanged')}
                              </p>
                            )}
                          </>
                        )}
                      </FinanceTable.Td>
                    )}
                    {isAdmin && (
                      <FinanceTable.Td align="center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(u.uid)}
                          disabled={u.uid === currentUser?.uid || u.role === 'super_admin'}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </FinanceTable.Td>
                    )}
                  </FinanceTable.Row>
                ))}
              </FinanceTable.Body>
            </FinanceTable>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {users.map((u) => (
              <MobileUserCard
                key={u.uid}
                user={u}
                currentUser={currentUser}
                isAdmin={isAdmin}
                roleLabel={ROLE_LABELS[u.role]}
                successUid={successUid}
                onRoleChange={handleRoleChange}
                onDelete={handleDeleteUser}
              />
            ))}
          </div>

          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}

      <Dialog open={confirmDialog.open} onClose={closeConfirm} size="sm">
        <Dialog.Title onClose={closeConfirm}>확인</Dialog.Title>
        <Dialog.Content>
          <p>{confirmDialog.message}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={closeConfirm}>
            취소
          </Button>
          <Button variant="danger" onClick={confirmDialog.onConfirm}>
            확인
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Layout>
  )
}
