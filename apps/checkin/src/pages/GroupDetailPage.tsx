import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { participantsAtom, groupsAtom, roomsAtom, syncAtom } from '../stores/dataStore'
import {
  updateGroup,
  removeParticipantFromGroup,
  assignParticipantToGroup
} from '../services/firebase'
import { addToastAtom } from '../stores/toastStore'
import { userNameAtom } from '../stores/userStore'
import { writeAuditLog } from '../services/auditLog'
import type { Group } from '../types'
import { DetailPageSkeleton } from '../components'
import { LeaderBadge, ConfirmDialog } from '../components/ui'

function GroupDetailPage(): React.ReactElement {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const groups = useAtomValue(groupsAtom)
  const rooms = useAtomValue(roomsAtom)
  const participants = useAtomValue(participantsAtom)
  const sync = useSetAtom(syncAtom)
  const addToast = useSetAtom(addToastAtom)
  const userName = useAtomValue(userNameAtom)

  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [editGroupName, setEditGroupName] = useState('')
  const [editExpectedCapacity, setEditExpectedCapacity] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')

  const [movingParticipantId, setMovingParticipantId] = useState<string | null>(null)
  const [leaderConfirm, setLeaderConfirm] = useState<{
    open: boolean
    participantId: string
    participantName: string
    isRemoving: boolean
  }>({ open: false, participantId: '', participantName: '', isRemoving: false })

  const presetTags = ['male', 'female']

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await sync()
      setIsLoading(false)
    }
    init()
  }, [sync])

  const group = groups.find((g) => g.id === id)
  const groupParticipants = participants.filter((p) => p.groupId === id)

  useEffect(() => {
    if (group) {
      setEditGroupName(group.name)
      setEditExpectedCapacity(group.expectedCapacity?.toString() || '')
      setEditTags(group.tags || [])
    }
  }, [group])

  const handleSaveEdit = async () => {
    if (!group || !id) return
    if (!editGroupName.trim()) {
      addToast({ type: 'error', message: t('validation.groupNameRequired') })
      return
    }

    setIsSaving(true)
    try {
      const changes: Record<string, { from: unknown; to: unknown }> = {}
      const newCapacity = editExpectedCapacity.trim()
        ? parseInt(editExpectedCapacity.trim(), 10)
        : undefined

      if (editGroupName.trim() !== group.name) {
        changes.name = { from: group.name, to: editGroupName.trim() }
      }
      if (newCapacity !== group.expectedCapacity) {
        changes.expectedCapacity = { from: group.expectedCapacity || null, to: newCapacity || null }
      }
      const tagsChanged =
        JSON.stringify(editTags.sort()) !== JSON.stringify((group.tags || []).sort())
      if (tagsChanged) {
        changes.tags = { from: group.tags || [], to: editTags }
      }

      await updateGroup(id, {
        name: editGroupName.trim(),
        expectedCapacity: newCapacity,
        tags: editTags.length > 0 ? editTags : null
      })

      if (Object.keys(changes).length > 0) {
        await writeAuditLog(userName || 'Unknown', 'update', 'group', id, group.name, changes)
      }

      await sync()
      setIsEditing(false)
      addToast({ type: 'success', message: t('group.groupUpdated') })
    } catch (error) {
      console.error('Update group error:', error)
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('toast.updateGroupFailed')
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(t('participant.removeFromGroup') + ` - ${participantName}?`)) return

    try {
      await removeParticipantFromGroup(participantId)
      await writeAuditLog(
        userName || 'Unknown',
        'assign',
        'participant',
        participantId,
        participantName,
        { group: { from: group?.name, to: null } }
      )
      await sync()
      addToast({ type: 'success', message: t('group.participantRemoved') })
    } catch (error) {
      console.error('Remove participant error:', error)
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('toast.removeParticipantFailed')
      })
    }
  }

  const handleMoveParticipant = async (
    participantId: string,
    participantName: string,
    targetGroup: Group
  ) => {
    if (!group) return

    try {
      await assignParticipantToGroup(participantId, targetGroup.id, targetGroup.name)
      await writeAuditLog(
        userName || 'Unknown',
        'assign',
        'participant',
        participantId,
        participantName,
        { group: { from: group.name, to: targetGroup.name } }
      )
      await sync()
      setMovingParticipantId(null)
      addToast({ type: 'success', message: t('group.movedTo', { name: targetGroup.name }) })
    } catch (error) {
      console.error('Move participant error:', error)
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('toast.moveParticipantFailed')
      })
    }
  }

  const handleSetLeader = async () => {
    if (!group || !id) return

    try {
      const { participantId, participantName, isRemoving } = leaderConfirm

      await updateGroup(id, {
        leaderId: isRemoving ? null : participantId,
        leaderName: isRemoving ? null : participantName
      })

      await writeAuditLog(userName || 'Unknown', 'update', 'group', id, group.name, {
        leader: {
          from: group.leaderName || null,
          to: isRemoving ? null : participantName
        }
      })

      await sync()
      setLeaderConfirm({ open: false, participantId: '', participantName: '', isRemoving: false })
      addToast({
        type: 'success',
        message: isRemoving ? t('group.leaderRemoved') : t('group.leaderSet')
      })
    } catch (error) {
      console.error('Set leader error:', error)
      addToast({ type: 'error', message: t('toast.updateGroupFailed') })
    }
  }

  const togglePresetTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const addCustomTag = () => {
    const tag = customTagInput.trim().toLowerCase()
    if (tag && !editTags.includes(tag)) {
      setEditTags((prev) => [...prev, tag])
      setCustomTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tag))
  }

  const getTagLabel = (tag: string) => {
    if (tag === 'male') return t('group.tagMale')
    if (tag === 'female') return t('group.tagFemale')
    return tag
  }

  const getTagColor = (tag: string) => {
    if (tag === 'male') return 'bg-blue-100 text-blue-700'
    if (tag === 'female') return 'bg-pink-100 text-pink-700'
    return 'bg-gray-100 text-gray-600'
  }

  if (isLoading) {
    return <DetailPageSkeleton type="group" />
  }

  if (!group) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-[#050505] mb-2">{t('group.groupNotFound')}</h2>
        <Link to="/groups" className="text-[#1877F2] hover:underline font-semibold">
          {t('group.backToGroups')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[#65676B] hover:text-[#1877F2] hover:bg-[#F0F2F5] rounded-lg font-semibold transition-colors"
          title={t('common.back')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          to="/groups"
          className="inline-flex items-center gap-1 text-[#65676B] hover:text-[#1877F2] font-semibold transition-colors"
        >
          {t('group.backToGroups')}
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-6 pb-6 border-b border-[#DADDE1]">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                      {t('group.groupName')}
                    </label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="px-3 py-2 border border-[#DADDE1] rounded-md text-xl font-bold text-[#050505] w-64 outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wide text-[#65676B] mb-1 font-semibold block">
                      {t('group.expectedCapacity')}
                    </label>
                    <input
                      type="number"
                      value={editExpectedCapacity}
                      onChange={(e) => setEditExpectedCapacity(e.target.value)}
                      placeholder={t('group.optional')}
                      min={1}
                      className="px-3 py-2 border border-[#DADDE1] rounded-md text-xl font-bold text-[#050505] w-32 outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Tags Edit Section */}
                <div>
                  <label className="text-xs uppercase tracking-wide text-[#65676B] mb-2 font-semibold block">
                    {t('group.tags')}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {presetTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePresetTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                          editTags.includes(tag)
                            ? getTagColor(tag)
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {getTagLabel(tag)}
                      </button>
                    ))}
                    <span className="text-[#DADDE1]">|</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        placeholder={t('group.addCustomTag')}
                        className="w-36 px-2 py-1.5 border border-[#DADDE1] rounded text-sm outline-none focus:ring-1 focus:ring-[#1877F2] focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addCustomTag()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addCustomTag}
                        disabled={!customTagInput.trim()}
                        className="px-2 py-1.5 bg-[#E7F3FF] text-[#1877F2] rounded text-sm font-semibold hover:bg-[#D4E8FF] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {editTags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-2">
                      {editTags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${getTagColor(tag)}`}
                        >
                          {getTagLabel(tag)}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:opacity-70 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold text-[#050505] mb-2">{group.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[#F0F2F5] text-[#65676B]">
                    {group.participantCount}
                    {group.expectedCapacity ? ` / ${group.expectedCapacity}` : ''}{' '}
                    {t('common.members')}
                  </span>
                  {group.expectedCapacity && (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        group.participantCount >= group.expectedCapacity
                          ? 'bg-[#FFEBEE] text-[#FA383E]'
                          : group.participantCount >= group.expectedCapacity * 0.75
                            ? 'bg-[#FFF3E0] text-[#F57C00]'
                            : 'bg-[#EFFFF6] text-[#31A24C]'
                      }`}
                    >
                      {group.participantCount >= group.expectedCapacity
                        ? t('room.full')
                        : group.participantCount >= group.expectedCapacity * 0.75
                          ? t('room.almostFull')
                          : t('room.available')}
                    </span>
                  )}
                  {group.tags?.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getTagColor(tag)}`}
                    >
                      {getTagLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-md font-semibold hover:bg-[#F0F2F5] transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1877F2] text-white rounded-md font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-md font-semibold hover:bg-[#F0F2F5] transition-colors"
              >
                {t('group.editGroup')}
              </button>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#050505] mb-4">
            {t('group.membersCount', { count: groupParticipants.length })}
          </h2>

          {groupParticipants.length > 0 ? (
            <div className="space-y-3">
              {groupParticipants.map((participant) => {
                const isLeader = group.leaderId === participant.id
                return (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isLeader
                        ? 'bg-purple-50 border-purple-200 hover:border-purple-300'
                        : 'bg-[#F0F2F5] border-transparent hover:border-[#DADDE1]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/participant/${participant.id}`}
                          className="text-lg font-semibold text-[#050505] hover:text-[#1877F2] hover:underline"
                        >
                          {participant.name}
                        </Link>
                        {isLeader && <LeaderBadge type="group" size="sm" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {participant.roomId && (
                          <Link
                            to={`/rooms/${participant.roomId}`}
                            className="text-sm text-[#1877F2] hover:underline"
                          >
                            {t('participant.room')}{' '}
                            {rooms.find((r) => r.id === participant.roomId)?.roomNumber ||
                              participant.roomNumber}
                          </Link>
                        )}
                        {participant.roomId && (participant.ward || participant.stake) && (
                          <span className="text-[#DADDE1]">•</span>
                        )}
                        {(participant.ward || participant.stake) && (
                          <span className="text-sm text-[#65676B]">
                            {participant.ward}
                            {participant.ward && participant.stake ? ', ' : ''}
                            {participant.stake}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setMovingParticipantId(
                              movingParticipantId === participant.id ? null : participant.id
                            )
                          }
                          className="px-3 py-1.5 bg-white border border-[#DADDE1] text-[#1877F2] text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
                        >
                          {t('common.move')}
                        </button>

                        {movingParticipantId === participant.id && (
                          <div className="absolute right-0 mt-2 w-64 bg-white border border-[#DADDE1] rounded-lg shadow-xl py-2 z-20 max-h-64 overflow-y-auto">
                            <div className="px-3 py-2 border-b border-[#DADDE1] text-xs font-bold text-[#65676B] uppercase tracking-wide sticky top-0 bg-white">
                              {t('participant.selectGroup')}
                            </div>
                            {groups
                              .filter((g) => g.id !== group.id)
                              .map((targetGroup) => (
                                <button
                                  key={targetGroup.id}
                                  onClick={() =>
                                    handleMoveParticipant(
                                      participant.id,
                                      participant.name,
                                      targetGroup
                                    )
                                  }
                                  className="w-full text-left px-4 py-2 flex justify-between items-center hover:bg-[#F0F2F5] cursor-pointer"
                                >
                                  <span className="font-medium text-[#050505]">
                                    {targetGroup.name}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-[#F0F2F5] text-[#65676B]">
                                    {targetGroup.participantCount} {t('common.members')}
                                  </span>
                                </button>
                              ))}
                            {groups.length <= 1 && (
                              <div className="px-4 py-3 text-sm text-[#65676B] text-center">
                                {t('group.noOtherGroups')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setLeaderConfirm({
                            open: true,
                            participantId: participant.id,
                            participantName: participant.name,
                            isRemoving: isLeader
                          })
                        }
                        className={`px-3 py-1.5 bg-white border text-sm font-semibold rounded transition-colors ${
                          isLeader
                            ? 'border-purple-300 text-purple-700 hover:bg-purple-50'
                            : 'border-[#DADDE1] text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        {isLeader ? t('group.removeLeader') : t('group.setLeader')}
                      </button>

                      <button
                        onClick={() => handleRemoveParticipant(participant.id, participant.name)}
                        className="px-3 py-1.5 bg-white border border-[#DADDE1] text-[#FA383E] text-sm font-semibold rounded hover:bg-[#FFF5F5] transition-colors"
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#F0F2F5] rounded-lg border-2 border-dashed border-[#DADDE1]">
              <p className="text-[#65676B] font-medium">{t('group.noMembers')}</p>
            </div>
          )}
        </div>
      </div>

      {movingParticipantId && (
        <div
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setMovingParticipantId(null)}
        />
      )}

      <ConfirmDialog
        isOpen={leaderConfirm.open}
        onClose={() =>
          setLeaderConfirm({
            open: false,
            participantId: '',
            participantName: '',
            isRemoving: false
          })
        }
        onConfirm={handleSetLeader}
        title={leaderConfirm.isRemoving ? t('group.removeLeader') : t('group.setLeader')}
        message={
          leaderConfirm.isRemoving
            ? t('group.confirmRemoveLeader')
            : t('group.confirmSetLeader', { name: leaderConfirm.participantName })
        }
        confirmText={t('common.confirm')}
        variant={leaderConfirm.isRemoving ? 'danger' : 'primary'}
      />
    </div>
  )
}

export default GroupDetailPage
