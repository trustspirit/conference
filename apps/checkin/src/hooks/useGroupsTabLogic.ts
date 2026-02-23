import { useState, useCallback } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { moveParticipantsToGroup } from '../services/firebase'
import { participantsAtom, syncAtom } from '../stores/dataStore'
import type { Group } from '../types'

export function useGroupsTabLogic() {
  const { t } = useTranslation()
  const allParticipants = useAtomValue(participantsAtom)
  const sync = useSetAtom(syncAtom)

  // Expansion state
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  // Selection state
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Set<string>>(new Set())

  // Modal state
  const [showMoveToGroupModal, setShowMoveToGroupModal] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)

  // Hover state
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)

  // Helper functions
  const getGroupMembers = useCallback(
    (groupId: string) => {
      return allParticipants.filter((p) => p.groupId === groupId)
    },
    [allParticipants]
  )

  // Toggle functions
  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId))
    setSelectedGroupMembers(new Set())
  }, [])

  const toggleGroupMemberSelection = useCallback((memberId: string) => {
    setSelectedGroupMembers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }, [])

  // Move handler
  const handleMoveToGroup = useCallback(
    async (targetGroup: Group) => {
      setIsMoving(true)
      setMoveError(null)
      try {
        await moveParticipantsToGroup(
          Array.from(selectedGroupMembers),
          targetGroup.id,
          targetGroup.name
        )
        await sync()
        setSelectedGroupMembers(new Set())
        setShowMoveToGroupModal(false)
      } catch (error) {
        setMoveError(error instanceof Error ? error.message : t('toast.moveParticipantFailed'))
      } finally {
        setIsMoving(false)
      }
    },
    [selectedGroupMembers, sync, t]
  )

  const openMoveModal = useCallback(() => {
    setMoveError(null)
    setShowMoveToGroupModal(true)
  }, [])

  const closeMoveModal = useCallback(() => {
    setShowMoveToGroupModal(false)
  }, [])

  return {
    // Expansion
    expandedGroupId,
    toggleGroupExpand,

    // Selection
    selectedGroupMembers,
    setSelectedGroupMembers,
    toggleGroupMemberSelection,

    // Modal
    showMoveToGroupModal,
    isMoving,
    moveError,
    setMoveError,
    handleMoveToGroup,
    openMoveModal,
    closeMoveModal,

    // Hover
    hoveredGroupId,
    setHoveredGroupId,

    // Helpers
    getGroupMembers
  }
}
