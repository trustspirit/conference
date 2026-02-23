import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import {
  checkInParticipant,
  checkOutParticipant,
  assignParticipantToGroup,
  assignParticipantToRoom,
  createOrGetGroup,
  createOrGetRoom,
  updateParticipant
} from '../services/firebase'
import { participantsAtom, groupsAtom, roomsAtom, syncAtom } from '../stores/dataStore'
import type { Group, Room, CheckInRecord } from '../types'
import { addToastAtom } from '../stores/toastStore'
import { userNameAtom } from '../stores/userStore'
import { writeAuditLog } from '../services/auditLog'
import { DetailPageSkeleton, ParticipantQRCode } from '../components'
import { ConfirmDialog, PhoneInput, LeaderBadge } from '../components/ui'
import { formatPhoneNumber } from '../utils/phoneFormat'
import { generateKeyFromParticipant } from '../utils/generateParticipantKey'

interface EditFormData {
  name: string
  email: string
  phoneNumber: string
  gender: string
  age: string
  birthDate: string
  ward: string
  stake: string
  isPaid: boolean
  memo: string
}

function ParticipantDetailPage(): React.ReactElement {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const participants = useAtomValue(participantsAtom)
  const groups = useAtomValue(groupsAtom)
  const rooms = useAtomValue(roomsAtom)
  const sync = useSetAtom(syncAtom)
  const addToast = useSetAtom(addToastAtom)
  const userName = useAtomValue(userNameAtom)

  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [showGroupSelect, setShowGroupSelect] = useState(false)
  const [showRoomSelect, setShowRoomSelect] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState(4)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [isEditingMemo, setIsEditingMemo] = useState(false)
  const [memoValue, setMemoValue] = useState('')
  const [isSavingMemo, setIsSavingMemo] = useState(false)
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    gender: '',
    age: '',
    birthDate: '',
    ward: '',
    stake: '',
    isPaid: false,
    memo: ''
  })
  const [participantKey, setParticipantKey] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await sync()
      setIsLoading(false)
    }
    init()
  }, [sync])

  const participant = participants.find((p) => p.id === id) || null

  // 참가자 키 생성
  useEffect(() => {
    const generateKey = async () => {
      if (participant?.name && participant?.birthDate) {
        const key = await generateKeyFromParticipant(participant.name, participant.birthDate)
        setParticipantKey(key)
      } else {
        setParticipantKey(null)
      }
    }
    generateKey()
  }, [participant?.name, participant?.birthDate])

  const handleCheckIn = async () => {
    if (!participant) return
    setIsCheckingIn(true)
    try {
      await checkInParticipant(participant.id)
      await writeAuditLog(
        userName || 'Unknown',
        'check_in',
        'participant',
        participant.id,
        participant.name
      )
      await sync()
    } catch (error) {
      console.error('Check-in error:', error)
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async (checkInId: string) => {
    if (!participant) return
    try {
      await checkOutParticipant(participant.id, checkInId)
      await writeAuditLog(
        userName || 'Unknown',
        'check_out',
        'participant',
        participant.id,
        participant.name
      )
      await sync()
    } catch (error) {
      console.error('Check-out error:', error)
    }
  }

  const handleTogglePayment = async () => {
    if (!participant) return
    setIsUpdatingPayment(true)
    try {
      const newStatus = !participant.isPaid
      await updateParticipant(participant.id, { isPaid: newStatus })
      await writeAuditLog(
        userName || 'Unknown',
        'update',
        'participant',
        participant.id,
        participant.name,
        { isPaid: { from: participant.isPaid, to: newStatus } }
      )
      addToast({
        type: 'success',
        message: t('toast.paymentUpdated', {
          status: newStatus ? t('participant.paid') : t('participant.unpaid')
        })
      })
      await sync()
    } catch (error) {
      console.error('Payment update error:', error)
      addToast({ type: 'error', message: t('toast.paymentUpdateFailed') })
    } finally {
      setIsUpdatingPayment(false)
      setShowPaymentConfirm(false)
    }
  }

  const handleStartEditMemo = () => {
    if (!participant) return
    setMemoValue(participant.memo || '')
    setIsEditingMemo(true)
  }

  const handleCancelEditMemo = () => {
    setIsEditingMemo(false)
    setMemoValue('')
  }

  const handleSaveMemo = async () => {
    if (!participant) return
    const newMemo = memoValue.trim()
    const oldMemo = participant.memo || ''

    if (newMemo === oldMemo) {
      setIsEditingMemo(false)
      return
    }

    setIsSavingMemo(true)
    try {
      await updateParticipant(participant.id, { memo: newMemo })
      await writeAuditLog(
        userName || 'Unknown',
        'update',
        'participant',
        participant.id,
        participant.name,
        { memo: { from: oldMemo || null, to: newMemo || null } }
      )
      addToast({ type: 'success', message: t('participant.memoUpdated') })
      await sync()
      setIsEditingMemo(false)
    } catch (error) {
      console.error('Memo update error:', error)
      addToast({ type: 'error', message: t('toast.saveFailed') })
    } finally {
      setIsSavingMemo(false)
    }
  }

  const handleGroupAssign = async (group: Group) => {
    if (!participant) return
    try {
      const oldGroup = participant.groupName
      await assignParticipantToGroup(participant.id, group.id, group.name)
      await writeAuditLog(
        userName || 'Unknown',
        'assign',
        'participant',
        participant.id,
        participant.name,
        {
          group: { from: oldGroup || null, to: group.name }
        }
      )
      await sync()
      setShowGroupSelect(false)
    } catch (error) {
      console.error('Group assignment error:', error)
    }
  }

  const handleNewGroup = async () => {
    if (!newGroupName.trim() || !participant) return
    try {
      const oldGroup = participant.groupName
      const group = await createOrGetGroup(newGroupName.trim())
      await assignParticipantToGroup(participant.id, group.id, group.name)
      await writeAuditLog(
        userName || 'Unknown',
        'assign',
        'participant',
        participant.id,
        participant.name,
        {
          group: { from: oldGroup || null, to: group.name }
        }
      )
      await sync()
      setNewGroupName('')
      setShowGroupSelect(false)
    } catch (error) {
      console.error('Create group error:', error)
    }
  }

  const handleRoomAssign = async (room: Room) => {
    if (!participant) return
    if (room.currentOccupancy >= room.maxCapacity) {
      alert(t('participant.roomFull'))
      return
    }
    try {
      const oldRoom = participant.roomNumber
      await assignParticipantToRoom(participant.id, room.id, room.roomNumber)
      await writeAuditLog(
        userName || 'Unknown',
        'assign',
        'participant',
        participant.id,
        participant.name,
        {
          room: { from: oldRoom || null, to: room.roomNumber }
        }
      )
      await sync()
      setShowRoomSelect(false)
    } catch (error) {
      console.error('Room assignment error:', error)
    }
  }

  const handleNewRoom = async () => {
    if (!newRoomNumber.trim() || !participant) return
    try {
      const oldRoom = participant.roomNumber
      const room = await createOrGetRoom(newRoomNumber.trim(), newRoomCapacity)
      await assignParticipantToRoom(participant.id, room.id, room.roomNumber)
      await writeAuditLog(
        userName || 'Unknown',
        'assign',
        'participant',
        participant.id,
        participant.name,
        {
          room: { from: oldRoom || null, to: room.roomNumber }
        }
      )
      await sync()
      setNewRoomNumber('')
      setNewRoomCapacity(4)
      setShowRoomSelect(false)
    } catch (error) {
      console.error('Create room error:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  }

  const getActiveCheckIn = (): CheckInRecord | undefined => {
    return participant?.checkIns.find((ci) => !ci.checkOutTime)
  }

  const startEditing = () => {
    if (!participant) return
    setEditForm({
      name: participant.name,
      email: participant.email,
      phoneNumber: formatPhoneNumber(participant.phoneNumber || ''),
      gender: participant.gender || '',
      age: participant.age?.toString() || '',
      birthDate: participant.birthDate || '',
      ward: participant.ward || '',
      stake: participant.stake || '',
      isPaid: participant.isPaid,
      memo: participant.memo || ''
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({
      name: '',
      email: '',
      phoneNumber: '',
      gender: '',
      age: '',
      birthDate: '',
      ward: '',
      stake: '',
      isPaid: false,
      memo: ''
    })
  }

  const handleSaveEdit = async () => {
    if (!participant) return
    if (!editForm.name.trim() || !editForm.email.trim()) {
      addToast({ type: 'error', message: t('participant.nameRequired') })
      return
    }

    setIsSaving(true)
    try {
      const changes: Record<string, { from: unknown; to: unknown }> = {}

      if (editForm.name.trim() !== participant.name) {
        changes.name = { from: participant.name, to: editForm.name.trim() }
      }
      if (editForm.email.trim() !== participant.email) {
        changes.email = { from: participant.email, to: editForm.email.trim() }
      }
      if ((editForm.phoneNumber.trim() || '') !== (participant.phoneNumber || '')) {
        changes.phoneNumber = {
          from: participant.phoneNumber || null,
          to: editForm.phoneNumber.trim() || null
        }
      }
      if ((editForm.gender || '') !== (participant.gender || '')) {
        changes.gender = { from: participant.gender || null, to: editForm.gender || null }
      }
      if ((editForm.age ? parseInt(editForm.age) : null) !== (participant.age || null)) {
        changes.age = {
          from: participant.age || null,
          to: editForm.age ? parseInt(editForm.age) : null
        }
      }
      if ((editForm.birthDate || '') !== (participant.birthDate || '')) {
        changes.birthDate = {
          from: participant.birthDate || null,
          to: editForm.birthDate || null
        }
      }
      if ((editForm.ward.trim() || '') !== (participant.ward || '')) {
        changes.ward = { from: participant.ward || null, to: editForm.ward.trim() || null }
      }
      if ((editForm.stake.trim() || '') !== (participant.stake || '')) {
        changes.stake = { from: participant.stake || null, to: editForm.stake.trim() || null }
      }
      if (editForm.isPaid !== participant.isPaid) {
        changes.isPaid = { from: participant.isPaid, to: editForm.isPaid }
      }
      if ((editForm.memo.trim() || '') !== (participant.memo || '')) {
        changes.memo = { from: participant.memo || null, to: editForm.memo.trim() || null }
      }

      await updateParticipant(participant.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        gender: editForm.gender || undefined,
        age: editForm.age ? parseInt(editForm.age) : undefined,
        birthDate: editForm.birthDate || undefined,
        ward: editForm.ward.trim() || undefined,
        stake: editForm.stake.trim() || undefined,
        isPaid: editForm.isPaid,
        memo: editForm.memo.trim() || undefined
      })

      if (Object.keys(changes).length > 0) {
        await writeAuditLog(
          userName || 'Unknown',
          'update',
          'participant',
          participant.id,
          participant.name,
          changes
        )
      }

      addToast({ type: 'success', message: t('participant.updateSuccess') })
      setIsEditing(false)
      await sync()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.updateFailed')
      addToast({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <DetailPageSkeleton type="participant" />
  }

  if (!participant) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-[#050505] mb-2">
          {t('participant.participantNotFound')}
        </h2>
        <Link to="/" className="text-[#1877F2] hover:underline font-semibold">
          {t('participant.backToSearch')}
        </Link>
      </div>
    )
  }

  const activeCheckIn = getActiveCheckIn()

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] rounded-md font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('common.back')}
        </button>
        <span className="text-[#DADDE1]">|</span>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[#65676B] hover:text-[#1877F2] font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {t('common.goToSearch')}
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[#050505]">{participant.name}</h1>
              {activeCheckIn ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-[#EFFFF6] text-[#31A24C] border border-[#31A24C]/20">
                  <div className="w-2 h-2 bg-[#31A24C] rounded-full animate-pulse"></div>
                  {t('participant.checkedIn')}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[#F0F2F5] text-[#65676B]">
                  {t('participant.notCheckedIn')}
                </span>
              )}
            </div>
            <p className="text-[#65676B] mt-1 text-lg">
              {participant.ward && participant.ward}
              {participant.stake && `, ${participant.stake}`}
            </p>
          </div>
          <div className="flex gap-3">
            {!isEditing && (
              <button
                onClick={startEditing}
                className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-md font-semibold hover:bg-[#F0F2F5] transition-colors"
              >
                {t('common.edit')}
              </button>
            )}
            {activeCheckIn ? (
              <button
                onClick={() => handleCheckOut(activeCheckIn.id)}
                disabled={isEditing}
                className="px-6 py-2 bg-[#FA383E] text-white rounded-md font-semibold hover:bg-[#D32F2F] transition-colors shadow-sm disabled:opacity-50"
              >
                {t('participant.checkOut')}
              </button>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn || isEditing}
                className="px-6 py-2 bg-[#1877F2] text-white rounded-md font-semibold hover:bg-[#166FE5] transition-colors shadow-sm disabled:opacity-50"
              >
                {isCheckingIn ? t('participant.checkingIn') : t('participant.checkIn')}
              </button>
            )}
          </div>
        </div>

        {activeCheckIn && (
          <div className="bg-[#EFFFF6] border border-[#31A24C] rounded-md p-4 mb-6">
            <div className="flex items-center gap-2 text-[#31A24C]">
              <div className="w-3 h-3 bg-[#31A24C] rounded-full animate-pulse"></div>
              <span className="font-bold">{t('participant.currentlyCheckedIn')}</span>
              <span className="text-[#31A24C]">
                {t('common.since')} {formatDate(activeCheckIn.checkInTime)}
              </span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#DADDE1]">
            <h2 className="text-lg font-bold text-[#050505]">{t('participant.personalInfo')}</h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="px-4 py-1.5 border border-[#DADDE1] text-[#65676B] rounded-md text-sm font-semibold hover:bg-[#F0F2F5] transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#1877F2] text-white rounded-md text-sm font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('common.name')} *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('common.email')} *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('common.phone')}
                </label>
                <PhoneInput
                  value={editForm.phoneNumber}
                  onChange={(value) => setEditForm({ ...editForm, phoneNumber: value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.gender')}
                </label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
                >
                  <option value="">{t('common.select')}</option>
                  <option value="male">{t('participant.male')}</option>
                  <option value="female">{t('participant.female')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.age')}
                </label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  min={1}
                  max={150}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.birthDate')}
                </label>
                <input
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.ward')}
                </label>
                <input
                  type="text"
                  value={editForm.ward}
                  onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.stake')}
                </label>
                <input
                  type="text"
                  value={editForm.stake}
                  onChange={(e) => setEditForm({ ...editForm, stake: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.paymentStatus')}
                </label>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isPaid: !editForm.isPaid })}
                  className={`w-full px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                    editForm.isPaid
                      ? 'bg-[#EFFFF6] text-[#31A24C] border border-[#31A24C]'
                      : 'bg-[#FFEBEE] text-[#FA383E] border border-[#FA383E]'
                  }`}
                >
                  {editForm.isPaid ? t('participant.paid') : t('participant.unpaid')}
                </button>
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                  {t('participant.memo')}
                </label>
                <textarea
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent resize-none"
                  placeholder={t('participant.memoPlaceholder')}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('common.name')}
                </div>
                <div className="font-semibold text-[#050505]">{participant.name}</div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('common.email')}
                </div>
                <div className="font-semibold text-[#050505]">{participant.email}</div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('common.phone')}
                </div>
                <div className="font-semibold text-[#050505]">
                  {participant.phoneNumber ? formatPhoneNumber(participant.phoneNumber) : '-'}
                </div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('participant.gender')}
                </div>
                <div className="font-semibold text-[#050505] capitalize">
                  {participant.gender ? t(`participant.${participant.gender}`) : '-'}
                </div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('participant.age')}
                </div>
                <div className="font-semibold text-[#050505]">{participant.age || '-'}</div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('participant.birthDate')}
                </div>
                <div className="font-semibold text-[#050505]">{participant.birthDate || '-'}</div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('participant.ward')}
                </div>
                <div className="font-semibold text-[#050505]">{participant.ward || '-'}</div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('participant.stake')}
                </div>
                <div className="font-semibold text-[#050505]">{participant.stake || '-'}</div>
              </div>
              <div className="bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                  {t('participant.paymentStatus')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPaymentConfirm(true)}
                    disabled={isUpdatingPayment || isEditing}
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      participant.isPaid
                        ? 'bg-[#EFFFF6] text-[#31A24C] hover:bg-[#D4EDDA] border border-[#31A24C]/20'
                        : 'bg-[#FFEBEE] text-[#FA383E] hover:bg-[#FFCDD2] border border-[#FA383E]/20'
                    }`}
                  >
                    {isUpdatingPayment ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <>
                        {participant.isPaid ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </>
                    )}
                    {participant.isPaid ? t('participant.paid') : t('participant.unpaid')}
                    {!isEditing && (
                      <svg
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    )}
                  </button>
                  {!isEditing && (
                    <span className="text-xs text-[#65676B]">{t('common.clickToChange')}</span>
                  )}
                </div>
              </div>
              <div className="col-span-2 md:col-span-3 bg-[#F0F2F5] rounded-md p-3 border border-transparent">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                    {t('participant.memo')}
                  </div>
                  {!isEditing && !isEditingMemo && (
                    <button
                      onClick={handleStartEditMemo}
                      className="text-xs text-[#1877F2] hover:underline font-semibold"
                    >
                      {participant.memo ? t('participant.editMemo') : t('participant.addMemo')}
                    </button>
                  )}
                </div>
                {isEditingMemo ? (
                  <div className="space-y-2">
                    <textarea
                      value={memoValue}
                      onChange={(e) => setMemoValue(e.target.value)}
                      rows={3}
                      placeholder={t('participant.memoPlaceholder')}
                      className="w-full px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent resize-none bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelEditMemo}
                        disabled={isSavingMemo}
                        className="px-3 py-1.5 text-sm text-[#65676B] hover:bg-[#E4E6EB] rounded-md font-medium transition-colors disabled:opacity-50"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleSaveMemo}
                        disabled={isSavingMemo}
                        className="px-3 py-1.5 text-sm bg-[#1877F2] text-white rounded-md font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSavingMemo && (
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        )}
                        {isSavingMemo ? t('common.saving') : t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : participant.memo ? (
                  <div className="font-semibold text-[#050505] whitespace-pre-wrap">
                    {participant.memo}
                  </div>
                ) : (
                  <div className="text-[#65676B] text-sm italic">{t('participant.noMemo')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QR Code & Unique Key Section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#050505] mb-4 pb-2 border-b border-[#DADDE1]">
            {t('qr.participantQR')}
          </h2>
          <div className="bg-[#F7F8FA] rounded-lg p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <ParticipantQRCode participant={participant} size={140} />
                {/* Unique Key Display */}
                {participantKey ? (
                  <div className="bg-white border border-[#DADDE1] rounded-lg px-4 py-2 text-center">
                    <div className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold">
                      {t('participant.uniqueKey')}
                    </div>
                    <div className="font-mono text-xl font-bold text-[#1877F2] tracking-widest">
                      {participantKey}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FFF3CD] border border-[#FFEEBA] rounded-lg px-4 py-2 text-center">
                    <div className="text-xs text-[#856404]">
                      {t('participant.noBirthDateForKey')}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm text-[#65676B] mb-2">{t('qr.qrDescription')}</p>
                <ul className="text-sm text-[#65676B] space-y-1">
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#1877F2]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t('qr.feature1')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#1877F2]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t('qr.feature2')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#1877F2]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t('qr.feature3')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[#1877F2]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t('qr.feature4')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#050505] mb-4 pb-2 border-b border-[#DADDE1]">
            {t('participant.groupRoomAssignment')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Group Assignment */}
            <div>
              <div className="text-sm font-semibold text-[#65676B] mb-2">
                {t('participant.group')}
              </div>
              <div className="flex items-center gap-3">
                {participant.groupName && participant.groupId ? (
                  <>
                    <Link
                      to={`/groups/${participant.groupId}`}
                      className="px-4 py-2 bg-[#E7F3FF] text-[#1877F2] rounded-md font-bold shadow-sm hover:bg-[#D4E8FF] transition-colors"
                    >
                      {participant.groupName}
                    </Link>
                    {groups.find((g) => g.id === participant.groupId)?.leaderId ===
                      participant.id && <LeaderBadge type="group" size="md" />}
                  </>
                ) : (
                  <span className="px-4 py-2 bg-[#F0F2F5] text-[#65676B] rounded-md font-medium">
                    {t('common.notAssigned')}
                  </span>
                )}
                <button
                  onClick={() => setShowGroupSelect(!showGroupSelect)}
                  className="text-[#1877F2] hover:underline text-sm font-semibold"
                >
                  {participant.groupName ? t('participant.change') : t('participant.assign')}
                </button>
              </div>
              {showGroupSelect && (
                <div className="mt-3 bg-white border border-[#DADDE1] rounded-lg shadow-xl p-4 z-10 relative">
                  <div className="text-sm font-bold text-[#050505] mb-2">
                    {t('participant.selectGroup')}
                  </div>
                  <div className="max-h-48 overflow-y-auto mb-3 pr-1">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => handleGroupAssign(group)}
                        className="flex justify-between items-center px-3 py-2 hover:bg-[#F0F2F5] rounded cursor-pointer"
                      >
                        <span className="text-[#050505] font-medium">{group.name}</span>
                        <span className="text-xs bg-[#F0F2F5] px-2 py-1 rounded text-[#65676B] font-medium">
                          {group.participantCount} {t('common.members')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#DADDE1] pt-3">
                    <div className="text-sm font-bold text-[#050505] mb-2">
                      {t('common.orCreateNew')}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={t('group.groupNamePlaceholder')}
                        className="flex-1 px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                      />
                      <button
                        onClick={handleNewGroup}
                        disabled={!newGroupName.trim()}
                        className="px-4 py-2 bg-[#1877F2] text-white rounded-md text-sm font-semibold hover:bg-[#166FE5] disabled:opacity-50"
                      >
                        {t('common.create')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Room Assignment */}
            <div>
              <div className="text-sm font-semibold text-[#65676B] mb-2">
                {t('participant.room')}
              </div>
              <div className="flex items-center gap-3">
                {participant.roomNumber && participant.roomId ? (
                  <>
                    <Link
                      to={`/rooms/${participant.roomId}`}
                      className="px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-md font-bold shadow-sm hover:bg-[#E4E6EB] transition-colors"
                    >
                      {t('participant.room')} {participant.roomNumber}
                    </Link>
                    {rooms.find((r) => r.id === participant.roomId)?.leaderId ===
                      participant.id && <LeaderBadge type="room" size="md" />}
                  </>
                ) : (
                  <span className="px-4 py-2 bg-[#F0F2F5] text-[#65676B] rounded-md font-medium">
                    {t('common.notAssigned')}
                  </span>
                )}
                <button
                  onClick={() => setShowRoomSelect(!showRoomSelect)}
                  className="text-[#1877F2] hover:underline text-sm font-semibold"
                >
                  {participant.roomNumber ? t('participant.change') : t('participant.assign')}
                </button>
              </div>
              {showRoomSelect && (
                <div className="mt-3 bg-white border border-[#DADDE1] rounded-lg shadow-xl p-4 z-10 relative">
                  <div className="text-sm font-bold text-[#050505] mb-2">
                    {t('participant.selectRoom')}
                  </div>
                  <div className="max-h-48 overflow-y-auto mb-3 pr-1">
                    {rooms.map((room) => {
                      const isFull = room.currentOccupancy >= room.maxCapacity
                      return (
                        <div
                          key={room.id}
                          onClick={() => !isFull && handleRoomAssign(room)}
                          className={`flex justify-between items-center px-3 py-2 rounded ${
                            isFull
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-[#F0F2F5] cursor-pointer'
                          }`}
                        >
                          <span className="text-[#050505] font-medium">
                            {t('participant.room')} {room.roomNumber}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded font-semibold ${
                              isFull ? 'bg-[#FFEBEE] text-[#FA383E]' : 'bg-[#EFFFF6] text-[#31A24C]'
                            }`}
                          >
                            {room.currentOccupancy}/{room.maxCapacity}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-[#DADDE1] pt-3">
                    <div className="text-sm font-bold text-[#050505] mb-2">
                      {t('common.orCreateNew')}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRoomNumber}
                        onChange={(e) => setNewRoomNumber(e.target.value)}
                        placeholder={t('room.roomNumberPlaceholder')}
                        className="flex-1 px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 4)}
                        placeholder={t('room.capacityShort')}
                        min={1}
                        className="w-20 px-3 py-2 border border-[#DADDE1] rounded-md text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                      />
                      <button
                        onClick={handleNewRoom}
                        disabled={!newRoomNumber.trim()}
                        className="px-4 py-2 bg-[#1877F2] text-white rounded-md text-sm font-semibold hover:bg-[#166FE5] disabled:opacity-50"
                      >
                        {t('common.create')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Check-in/Check-out History */}
        <div>
          <h2 className="text-lg font-bold text-[#050505] mb-4 pb-2 border-b border-[#DADDE1]">
            {t('participant.checkInHistory')}
          </h2>
          {participant.checkIns.length > 0 ? (
            <div className="space-y-4">
              {[...participant.checkIns].reverse().map((checkIn, index) => {
                const duration = checkIn.checkOutTime
                  ? Math.round(
                      (checkIn.checkOutTime.getTime() - checkIn.checkInTime.getTime()) / 1000 / 60
                    )
                  : null

                return (
                  <div
                    key={checkIn.id}
                    className="bg-[#F7F8FA] border border-[#DADDE1] rounded-lg overflow-hidden"
                  >
                    {/* Session header */}
                    <div className="flex justify-between items-center px-4 py-2 bg-[#F0F2F5] border-b border-[#DADDE1]">
                      <span className="text-xs font-semibold text-[#65676B] uppercase tracking-wide">
                        {t('participant.session')} #{participant.checkIns.length - index}
                      </span>
                      <div className="flex items-center gap-2">
                        {duration !== null && (
                          <span className="text-xs text-[#65676B] font-medium">
                            {t('participant.duration')}: {formatDuration(duration)}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            checkIn.checkOutTime
                              ? 'bg-[#E4E6EB] text-[#65676B]'
                              : 'bg-[#EFFFF6] text-[#31A24C] border border-[#31A24C]/20'
                          }`}
                        >
                          {checkIn.checkOutTime ? t('common.completed') : t('common.active')}
                        </span>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="p-4">
                      <div className="relative">
                        {/* Timeline line */}
                        <div
                          className={`absolute left-[7px] top-3 bottom-3 w-0.5 ${
                            checkIn.checkOutTime ? 'bg-[#DADDE1]' : 'bg-[#31A24C]'
                          }`}
                        ></div>

                        {/* Check-in event */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="relative z-10 w-4 h-4 rounded-full bg-[#1877F2] border-2 border-white shadow-sm flex-shrink-0 mt-0.5"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#1877F2] text-sm">
                                {t('participant.checkIn')}
                              </span>
                              <svg
                                className="w-4 h-4 text-[#1877F2]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 16l-4-4m0 0l4-4m-4 4h14"
                                />
                              </svg>
                            </div>
                            <div className="text-sm text-[#050505] font-medium">
                              {formatDate(checkIn.checkInTime)}
                            </div>
                          </div>
                        </div>

                        {/* Check-out event */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`relative z-10 w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-0.5 ${
                              checkIn.checkOutTime ? 'bg-[#FA383E]' : 'bg-[#DADDE1]'
                            }`}
                          ></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold text-sm ${
                                  checkIn.checkOutTime ? 'text-[#FA383E]' : 'text-[#65676B]'
                                }`}
                              >
                                {t('participant.checkOut')}
                              </span>
                              {checkIn.checkOutTime && (
                                <svg
                                  className="w-4 h-4 text-[#FA383E]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="text-sm text-[#050505] font-medium">
                              {checkIn.checkOutTime ? (
                                formatDate(checkIn.checkOutTime)
                              ) : (
                                <span className="text-[#31A24C] italic">
                                  {t('participant.currentlyCheckedIn')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-[#F7F8FA] border border-[#DADDE1] rounded-lg p-6 text-center">
              <svg
                className="w-12 h-12 text-[#DADDE1] mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-[#65676B] font-medium">{t('participant.noCheckInHistory')}</p>
              <p className="text-[#65676B] text-sm mt-1">{t('participant.checkInHistoryDesc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(false)}
        onConfirm={handleTogglePayment}
        title={t('participant.changePaymentStatus')}
        description={`${t('participant.paymentChangeConfirmText')} ${participant.isPaid ? t('participant.paid') : t('participant.unpaid')} ${t('participant.to')} ${!participant.isPaid ? t('participant.paid') : t('participant.unpaid')}?`}
        confirmText={
          isUpdatingPayment
            ? t('common.updating')
            : !participant.isPaid
              ? t('participant.markAsPaid')
              : t('participant.markAsUnpaid')
        }
        variant={participant.isPaid ? 'danger' : 'info'}
        isLoading={isUpdatingPayment}
      />
    </div>
  )
}

export default ParticipantDetailPage
