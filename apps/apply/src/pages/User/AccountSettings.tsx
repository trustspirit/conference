import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { isAdminRole, isLeaderRole, canApproveStakeWardChange, canDeleteUser } from '../../lib/roles'
import { useStakeWardChangeRequests, useCreateStakeWardChangeRequest, useApproveStakeWardChange } from '../../hooks/queries/useStakeWardChanges'
import { useUsers, useDeleteUser } from '../../hooks/queries/useUsers'
import { StakeWardSelector } from '../../components/form'
import { useToast, Tabs, TextField, Badge, Button, Dialog } from 'trust-ui-react'
import Alert from '../../components/Alert'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { getRoleTone, ACCOUNT_TABS } from '../../utils/constants'
import { ROLE_LABELS } from '../../utils/roleConfig'

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

export default function AccountSettings() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const role = appUser?.role
  const showApprovals = isLeaderRole(role) || isAdminRole(role)
  const showDeleteUsers = canDeleteUser(role)

  const availableTabs = useMemo(() => {
    const tabs: string[] = [ACCOUNT_TABS.SETTINGS]
    if (showApprovals) tabs.push(ACCOUNT_TABS.APPROVALS)
    if (showDeleteUsers) tabs.push(ACCOUNT_TABS.DELETE)
    return tabs
  }, [showApprovals, showDeleteUsers])

  const [activeTab, setActiveTab] = useState<string>(ACCOUNT_TABS.SETTINGS)

  const tabLabels: Record<string, string> = {
    [ACCOUNT_TABS.SETTINGS]: t('accountSettings.tabs.settings', '설정'),
    [ACCOUNT_TABS.APPROVALS]: t('accountSettings.tabs.approvals', '승인'),
    [ACCOUNT_TABS.DELETE]: t('accountSettings.tabs.deleteUsers', '사용자 삭제'),
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('accountSettings.title', '계정 설정')}</h1>
      <p className="text-sm text-gray-500 mb-4">{t('accountSettings.subtitle', '프로필 정보 및 기본 설정 관리')}</p>

      {availableTabs.length > 1 && (
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            {availableTabs.map((tab) => (
              <Tabs.Trigger key={tab} value={tab}>{tabLabels[tab]}</Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      )}

      <div style={{ marginTop: '1rem' }}>
        {activeTab === ACCOUNT_TABS.SETTINGS && <SettingsTab />}
        {activeTab === ACCOUNT_TABS.APPROVALS && showApprovals && <ApprovalsTab />}
        {activeTab === ACCOUNT_TABS.DELETE && showDeleteUsers && <DeleteUsersTab />}
      </div>
    </div>
  )
}

/* =========== Settings Tab =========== */
function SettingsTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser, updateAppUser } = useAuth()
  const role = appUser?.role
  const canEditDirectly = isAdminRole(role)
  const createChangeReq = useCreateStakeWardChangeRequest()

  const [editing, setEditing] = useState(false)
  const [stake, setStake] = useState(appUser?.stake || '')
  const [ward, setWard] = useState(appUser?.ward || '')
  const [saving, setSaving] = useState(false)

  // Preferred name
  const [editingName, setEditingName] = useState(false)
  const [preferredName, setPreferredName] = useState(appUser?.preferredName || '')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!editingName) {
      setPreferredName(appUser?.preferredName || '')
    }
  }, [appUser?.preferredName, editingName])

  const handleSaveName = async () => {
    setSavingName(true)
    try {
      await updateAppUser({ preferredName: preferredName.trim() || '' })
      toast({ variant: 'success', message: t('accountSettings.messages.profileUpdated') })
      setEditingName(false)
    } catch {
      toast({ variant: 'danger', message: t('errors.generic') })
    } finally {
      setSavingName(false)
    }
  }

  useEffect(() => {
    if (!editing) {
      setStake(appUser?.stake || '')
      setWard(appUser?.ward || '')
    }
  }, [appUser?.stake, appUser?.ward, editing])

  const hasChanges = stake !== (appUser?.stake || '') || ward !== (appUser?.ward || '')
  const hasPending = !!(appUser?.pendingStake || appUser?.pendingWard)

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    try {
      if (canEditDirectly) {
        await updateAppUser({ stake, ward })
        toast({ variant: 'success', message: t('accountSettings.messages.profileUpdated') })
      } else {
        await createChangeReq.mutateAsync({ stake, ward })
        toast({ variant: 'success', message: t('accountSettings.messages.stakeWardChangeRequested') })
      }
      setEditing(false)
    } catch {
      toast({ variant: 'danger', message: t('errors.generic') })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setStake(appUser?.stake || '')
    setWard(appUser?.ward || '')
    setEditing(false)
  }

  const roleLabelKey = role ? ROLE_LABELS[role] : ''
  const roleTone = getRoleTone(role)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Personal Information */}
      <section style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
          {t('accountSettings.sections.personalInformation.title', '개인 정보')}
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
          {t('accountSettings.sections.personalInformation.description')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{t('accountSettings.sections.personalInformation.accountName', '계정 이름')}</p>
            <p style={{ fontSize: '0.875rem', color: '#111827' }}>{appUser?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{t('common.email', '이메일')}</p>
            <p style={{ fontSize: '0.875rem', color: '#111827' }}>{appUser?.email}</p>
          </div>
        </div>

        {/* Preferred Name */}
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            {t('accountSettings.sections.personalInformation.preferredName', '선호 이름')}
          </p>
          {editingName ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <TextField
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder={t('accountSettings.sections.personalInformation.preferredNamePlaceholder', '앱에서 사용할 이름을 입력하세요')}
                fullWidth
              />
              <Button variant="primary" size="sm" onClick={handleSaveName} disabled={savingName}>
                {savingName ? t('common.saving', '저장 중...') : t('common.save', '저장')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditingName(false); setPreferredName(appUser?.preferredName || '') }}>
                {t('common.cancel', '취소')}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#111827' }}>
                {appUser?.preferredName || <span style={{ color: '#9ca3af' }}>{t('accountSettings.sections.personalInformation.preferredNameEmpty', '설정되지 않음 (계정 이름 사용)')}</span>}
              </p>
              <button
                onClick={() => setEditingName(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#2563eb', padding: '0.25rem 0.5rem' }}
              >
                {t('common.edit', '편집')}
              </button>
            </div>
          )}
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
            {t('accountSettings.sections.personalInformation.preferredNameHint', '설정하면 앱 내에서 이 이름이 표시됩니다.')}
          </p>
        </div>
      </section>

      {/* Account Role */}
      <section style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
          {t('accountSettings.sections.accountRole.title', '계정 역할')}
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
          {t('accountSettings.sections.accountRole.description')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant={TONE_TO_BADGE[roleTone] || 'secondary'}>
            {t(roleLabelKey)}
          </Badge>
          {appUser?.leaderStatus === 'pending' && (
            <span style={{ fontSize: '0.75rem', color: '#92400e' }}>
              {t('accountSettings.sections.accountRole.pendingApproval')}
            </span>
          )}
        </div>
      </section>

      {/* Church Information (Stake/Ward) */}
      <section style={{ borderRadius: '0.75rem', border: '1px solid #e5e7eb', backgroundColor: '#fff', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
          {t('accountSettings.sections.churchInformation.title', '교회 정보')}
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
          {canEditDirectly
            ? t('accountSettings.sections.churchInformation.description.immediate')
            : t('accountSettings.sections.churchInformation.description.requiresApproval')}
        </p>

        {hasPending && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert variant="warning">
              {t('accountSettings.sections.churchInformation.pendingAlert', {
                stake: appUser?.pendingStake,
                ward: appUser?.pendingWard,
              })}
            </Alert>
          </div>
        )}

        {editing ? (
          <>
            <StakeWardSelector
              stake={stake}
              ward={ward}
              onStakeChange={setStake}
              onWardChange={setWard}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="primary" onClick={handleSave} disabled={saving || !hasChanges}>
                {saving ? t('accountSettings.messages.saving') : t('accountSettings.messages.saveChanges')}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                {t('common.cancel', '취소')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <StakeWardSelector
              stake={appUser?.stake || ''}
              ward={appUser?.ward || ''}
              onStakeChange={() => {}}
              onWardChange={() => {}}
              readOnly
            />
            <Button variant="outline" onClick={() => setEditing(true)} style={{ marginTop: '0.75rem' }}>
              {t('common.edit', '편집')}
            </Button>
          </>
        )}
      </section>
    </div>
  )
}

/* =========== Approvals Tab =========== */
function ApprovalsTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { data: requests, isLoading } = useStakeWardChangeRequests()
  const approveChange = useApproveStakeWardChange()

  const filteredRequests = useMemo(() => {
    if (!requests) return []
    return requests.filter((req) => canApproveStakeWardChange(appUser?.role, req.userRole))
  }, [requests, appUser?.role])

  const handleApprove = (requestId: string) => {
    approveChange.mutate({ requestId, approved: true }, {
      onSuccess: () => toast({ variant: 'success', message: t('accountSettings.approvals.approved') }),
      onError: () => toast({ variant: 'danger', message: t('errors.generic') }),
    })
  }

  const handleReject = (requestId: string) => {
    approveChange.mutate({ requestId, approved: false }, {
      onSuccess: () => toast({ variant: 'success', message: t('accountSettings.approvals.rejected') }),
      onError: () => toast({ variant: 'danger', message: t('errors.generic') }),
    })
  }

  if (isLoading) return <Spinner />

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
        {t('accountSettings.approvals.title')}
      </h2>
      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
        {t('accountSettings.approvals.description')}
      </p>

      {filteredRequests.length === 0 ? (
        <EmptyState message={t('accountSettings.approvals.empty')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#fff',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{req.userName}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{req.userEmail}</p>
                </div>
                <Badge variant={TONE_TO_BADGE[getRoleTone(req.userRole)] || 'secondary'} size="sm">
                  {t(`roles.${req.userRole === 'stake_president' ? 'stakePresident' : req.userRole}`)}
                </Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{t('common.from')}</p>
                  <p style={{ color: '#6b7280' }}>{req.currentStake} / {req.currentWard}</p>
                </div>
                <span style={{ color: '#9ca3af' }}>&rarr;</span>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{t('common.to')}</p>
                  <p style={{ color: '#111827', fontWeight: 500 }}>{req.requestedStake} / {req.requestedWard}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="primary" size="sm" onClick={() => handleApprove(req.id)} disabled={approveChange.isPending}>
                  {t('accountSettings.approvals.approve', '승인')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleReject(req.id)} disabled={approveChange.isPending}>
                  {t('accountSettings.approvals.reject', '거부')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========== Delete Users Tab =========== */
function DeleteUsersTab() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const deleteUser = useDeleteUser()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; onConfirm: () => void; message: string }>({
    open: false, onConfirm: () => {}, message: '',
  })

  const filteredUsers = useMemo(() => {
    if (!users) return []
    return users
      .filter((u) => u.uid !== appUser?.uid)
      .filter((u) => {
        if (!search) return true
        const q = search.toLowerCase()
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      })
  }, [users, search, appUser?.uid])

  const toggleSelect = (uid: string) => {
    const next = new Set(selected)
    if (next.has(uid)) next.delete(uid)
    else next.add(uid)
    setSelected(next)
  }

  const handleDeleteSelected = () => {
    if (!selected.size) return
    setConfirmDialog({
      open: true,
      message: t('accountSettings.deleteUsers.confirmDelete'),
      onConfirm: async () => {
        setDeleting(true)
        try {
          await Promise.all(Array.from(selected).map((uid) => deleteUser.mutateAsync(uid)))
          setSelected(new Set())
        } finally {
          setDeleting(false)
          setConfirmDialog({ open: false, onConfirm: () => {}, message: '' })
        }
      },
    })
  }

  const handleDeleteSingle = (uid: string, name: string) => {
    setConfirmDialog({
      open: true,
      message: t('accountSettings.deleteUsers.confirmDeleteSingle', { userName: name }),
      onConfirm: async () => {
        setDeleting(true)
        try {
          await deleteUser.mutateAsync(uid)
        } finally {
          setDeleting(false)
          setConfirmDialog({ open: false, onConfirm: () => {}, message: '' })
        }
      },
    })
  }

  if (isLoading) return <Spinner />

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
        {t('accountSettings.deleteUsers.title')}
      </h2>
      <p style={{ fontSize: '0.75rem', color: '#dc2626', marginBottom: '1rem' }}>
        {t('accountSettings.deleteUsers.description')}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <TextField
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('accountSettings.deleteUsers.searchPlaceholder')}
          fullWidth
        />
        {selected.size > 0 && (
          <Button variant="danger" onClick={handleDeleteSelected} disabled={deleting}>
            {t('accountSettings.deleteUsers.deleteSelected')} ({selected.size})
          </Button>
        )}
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState message={search ? t('accountSettings.deleteUsers.noResults') : t('accountSettings.deleteUsers.empty')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredUsers.map((user) => (
            <div
              key={user.uid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: `1px solid ${selected.has(user.uid) ? '#fecaca' : '#e5e7eb'}`,
                backgroundColor: selected.has(user.uid) ? '#fef2f2' : '#fff',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(user.uid)}
                onChange={() => toggleSelect(user.uid)}
                style={{ width: '1rem', height: '1rem', accentColor: '#dc2626' }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{user.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</p>
              </div>
              <Badge variant={TONE_TO_BADGE[getRoleTone(user.role)] || 'secondary'} size="sm">
                {t(ROLE_LABELS[user.role!] || 'roles.applicant')}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteSingle(user.uid, user.name)} disabled={deleting}>
                <span className="text-red-600">{t('common.delete', '삭제')}</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, onConfirm: () => {}, message: '' })} size="sm">
        <Dialog.Title onClose={() => setConfirmDialog({ open: false, onConfirm: () => {}, message: '' })}>{t('common.confirm')}</Dialog.Title>
        <Dialog.Content>
          <p style={{ fontSize: '0.875rem', color: '#374151' }}>{confirmDialog.message}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={() => setConfirmDialog({ open: false, onConfirm: () => {}, message: '' })}>{t('common.cancel', '취소')}</Button>
          <Button variant="danger" onClick={confirmDialog.onConfirm}>{t('common.confirm', '확인')}</Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  )
}
