import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { isAdminRole, isLeaderRole, canApproveStakeWardChange, canDeleteUser } from '../../lib/roles'
import { useStakeWardChangeRequests, useCreateStakeWardChangeRequest, useApproveStakeWardChange } from '../../hooks/queries/useStakeWardChanges'
import { useUsers, useDeleteUser } from '../../hooks/queries/useUsers'
import { StakeWardSelector } from '../../components/form'
import { Input } from '../../components/form'
import Tabs from '../../components/Tabs'
import Alert from '../../components/Alert'
import StatusChip from '../../components/StatusChip'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/Toast'
import { getRoleTone, ACCOUNT_TABS } from '../../utils/constants'
import { ROLE_LABELS } from '../../utils/roleConfig'

export default function AccountSettings() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const role = appUser?.role
  const showApprovals = isLeaderRole(role) || isAdminRole(role)
  const showDeleteUsers = canDeleteUser(role)

  const availableTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [
      { id: ACCOUNT_TABS.SETTINGS, label: t('accountSettings.tabs.settings', '설정') },
    ]
    if (showApprovals) {
      tabs.push({ id: ACCOUNT_TABS.APPROVALS, label: t('accountSettings.tabs.approvals', '승인') })
    }
    if (showDeleteUsers) {
      tabs.push({ id: ACCOUNT_TABS.DELETE, label: t('accountSettings.tabs.deleteUsers', '사용자 삭제') })
    }
    return tabs
  }, [t, showApprovals, showDeleteUsers])

  const [activeTab, setActiveTab] = useState<string>(ACCOUNT_TABS.SETTINGS)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('accountSettings.title', '계정 설정')}</h1>
      <p className="text-sm text-gray-500 mb-4">{t('accountSettings.subtitle', '프로필 정보 및 기본 설정 관리')}</p>

      {availableTabs.length > 1 && (
        <Tabs tabs={availableTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {activeTab === ACCOUNT_TABS.SETTINGS && <SettingsTab />}
      {activeTab === ACCOUNT_TABS.APPROVALS && showApprovals && <ApprovalsTab />}
      {activeTab === ACCOUNT_TABS.DELETE && showDeleteUsers && <DeleteUsersTab />}
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

  // Sync local state when appUser changes (e.g. after approval)
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
        toast(t('accountSettings.messages.profileUpdated'))
      } else {
        await createChangeReq.mutateAsync({ stake, ward })
        toast(t('accountSettings.messages.stakeWardChangeRequested'))
      }
      setEditing(false)
    } catch {
      toast(t('errors.generic'), 'error')
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{t('common.name', '이름')}</p>
            <p style={{ fontSize: '0.875rem', color: '#111827' }}>{appUser?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{t('common.email', '이메일')}</p>
            <p style={{ fontSize: '0.875rem', color: '#111827' }}>{appUser?.email}</p>
          </div>
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
          <StatusChip label={t(roleLabelKey)} tone={getRoleTone(role)} size="md" />
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
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? t('accountSettings.messages.saving') : t('accountSettings.messages.saveChanges')}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel', '취소')}
              </button>
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
            <button
              onClick={() => setEditing(true)}
              className="mt-3 rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
            >
              {t('common.edit', '편집')}
            </button>
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
      onSuccess: () => toast(t('accountSettings.approvals.approved')),
      onError: () => toast(t('errors.generic'), 'error'),
    })
  }

  const handleReject = (requestId: string) => {
    approveChange.mutate({ requestId, approved: false }, {
      onSuccess: () => toast(t('accountSettings.approvals.rejected')),
      onError: () => toast(t('errors.generic'), 'error'),
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
                <StatusChip label={t(`roles.${req.userRole === 'stake_president' ? 'stakePresident' : req.userRole}`)} tone={getRoleTone(req.userRole)} />
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
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={approveChange.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {t('accountSettings.approvals.approve', '승인')}
                </button>
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={approveChange.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-medium"
                >
                  {t('accountSettings.approvals.reject', '거부')}
                </button>
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

  const filteredUsers = useMemo(() => {
    if (!users) return []
    return users
      .filter((u) => u.uid !== appUser?.uid) // exclude self
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

  const handleDeleteSelected = async () => {
    if (!selected.size) return
    if (!confirm(t('accountSettings.deleteUsers.confirmDelete'))) return
    setDeleting(true)
    try {
      await Promise.all(Array.from(selected).map((uid) => deleteUser.mutateAsync(uid)))
      setSelected(new Set())
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = async (uid: string, name: string) => {
    if (!confirm(t('accountSettings.deleteUsers.confirmDeleteSingle', { userName: name }))) return
    setDeleting(true)
    try {
      await deleteUser.mutateAsync(uid)
    } finally {
      setDeleting(false)
    }
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
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('accountSettings.deleteUsers.searchPlaceholder')}
        />
        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: '#dc2626',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('accountSettings.deleteUsers.deleteSelected')} ({selected.size})
          </button>
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
              <StatusChip label={t(ROLE_LABELS[user.role!] || 'roles.applicant')} tone={getRoleTone(user.role)} />
              <button
                onClick={() => handleDeleteSingle(user.uid, user.name)}
                disabled={deleting}
                style={{ fontSize: '0.75rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {t('common.delete', '삭제')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
