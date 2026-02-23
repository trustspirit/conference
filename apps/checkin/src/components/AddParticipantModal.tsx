import React, { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import {
  addParticipant,
  getAllGroups,
  getAllRooms,
  createOrGetGroup,
  createOrGetRoom
} from '../services/firebase'
import type { Group, Room } from '../types'
import { userNameAtom } from '../stores/userStore'
import { writeAuditLog } from '../services/auditLog'
import { PhoneInput } from './ui'

interface AddParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function AddParticipantModal({
  isOpen,
  onClose,
  onSuccess
}: AddParticipantModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')
  const [ward, setWard] = useState('')
  const [stake, setStake] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState('4')

  const [groups, setGroups] = useState<Group[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userName = useAtomValue(userNameAtom)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [groupsData, roomsData] = await Promise.all([getAllGroups(), getAllRooms()])
      setGroups(groupsData)
      setRooms(roomsData)
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhoneNumber('')
    setGender('')
    setAge('')
    setWard('')
    setStake('')
    setSelectedGroupId('')
    setSelectedRoomId('')
    setNewGroupName('')
    setNewRoomNumber('')
    setNewRoomCapacity('4')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim()) {
      setError(t('participant.nameRequired'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let groupId = selectedGroupId || undefined
      let groupName: string | undefined
      let roomId = selectedRoomId || undefined
      let roomNumber: string | undefined

      if (newGroupName.trim()) {
        const group = await createOrGetGroup(newGroupName.trim())
        groupId = group.id
        groupName = group.name
      } else if (groupId) {
        const group = groups.find((g) => g.id === groupId)
        groupName = group?.name
      }

      if (newRoomNumber.trim()) {
        const room = await createOrGetRoom(newRoomNumber.trim(), parseInt(newRoomCapacity) || 4)
        roomId = room.id
        roomNumber = room.roomNumber
      } else if (roomId) {
        const room = rooms.find((r) => r.id === roomId)
        roomNumber = room?.roomNumber
      }

      await addParticipant({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        gender: gender || undefined,
        age: age ? parseInt(age) : undefined,
        ward: ward.trim() || undefined,
        stake: stake.trim() || undefined,
        groupId,
        groupName,
        roomId,
        roomNumber
      }).then(async (newParticipant) => {
        await writeAuditLog(
          userName || 'Unknown',
          'create',
          'participant',
          newParticipant.id,
          newParticipant.name
        )
      })

      resetForm()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('toast.createFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#DADDE1] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#050505]">{t('participant.addParticipant')}</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F2F2F2] text-[#65676B]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('common.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                placeholder={t('common.name')}
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('common.email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('common.phone')}
              </label>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                placeholder={t('common.phone')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('participant.gender')}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] text-[#050505]"
              >
                <option value="">{t('common.select')}</option>
                <option value="male">{t('participant.male')}</option>
                <option value="female">{t('participant.female')}</option>
                <option value="other">{t('participant.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('participant.age')}
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                placeholder={t('participant.age')}
                min="0"
                max="150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('participant.ward')}
              </label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                placeholder={t('participant.ward')}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#050505] mb-1">
                {t('participant.stake')}
              </label>
              <input
                type="text"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                placeholder={t('participant.stake')}
              />
            </div>
          </div>

          <div className="border-t border-[#DADDE1] pt-4 mt-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-3">
              {t('participant.groupRoomAssignment').split(' & ')[0]}
            </h3>
            <div className="space-y-2">
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value)
                  if (e.target.value) setNewGroupName('')
                }}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] text-[#050505]"
              >
                <option value="">{t('common.notAssigned')}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.participantCount} {t('common.members')})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => {
                    setNewGroupName(e.target.value)
                    if (e.target.value) setSelectedGroupId('')
                  }}
                  className="flex-1 px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                  placeholder={t('common.orCreateNew')}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[#DADDE1] pt-4">
            <h3 className="text-sm font-semibold text-[#050505] mb-3">{t('participant.room')}</h3>
            <div className="space-y-2">
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value)
                  if (e.target.value) setNewRoomNumber('')
                }}
                className="w-full px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] text-[#050505]"
              >
                <option value="">{t('common.notAssigned')}</option>
                {rooms.map((room) => {
                  const isFull = room.currentOccupancy >= room.maxCapacity
                  return (
                    <option key={room.id} value={room.id} disabled={isFull}>
                      {t('participant.room')} {room.roomNumber} ({room.currentOccupancy}/
                      {room.maxCapacity}){isFull ? ` - ${t('room.full')}` : ''}
                    </option>
                  )
                })}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => {
                    setNewRoomNumber(e.target.value)
                    if (e.target.value) setSelectedRoomId('')
                  }}
                  className="flex-1 px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                  placeholder={t('common.orCreateNew')}
                />
                {newRoomNumber && (
                  <input
                    type="number"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    className="w-24 px-4 py-2 bg-[#F0F2F5] rounded-lg outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
                    placeholder={t('room.capacity')}
                    min="1"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-[#E4E6EB] text-[#050505] rounded-lg font-medium hover:bg-[#D8DADF] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="flex-1 px-4 py-2.5 bg-[#1877F2] text-white rounded-lg font-medium hover:bg-[#166FE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('common.loading') : t('participant.addParticipant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddParticipantModal
