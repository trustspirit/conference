import { useState, useCallback } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { moveParticipantsToRoom } from '../services/firebase'
import { participantsAtom, syncAtom } from '../stores/dataStore'
import type { Room } from '../types'

export function useRoomsTabLogic() {
  const { t } = useTranslation()
  const allParticipants = useAtomValue(participantsAtom)
  const sync = useSetAtom(syncAtom)

  // Expansion state
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)

  // Selection state
  const [selectedRoomMembers, setSelectedRoomMembers] = useState<Set<string>>(new Set())

  // Modal state
  const [showMoveToRoomModal, setShowMoveToRoomModal] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)

  // Hover state
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null)

  // Helper functions
  const getRoomMembers = useCallback(
    (roomId: string) => {
      return allParticipants.filter((p) => p.roomId === roomId)
    },
    [allParticipants]
  )

  // Toggle functions
  const toggleRoomExpand = useCallback((roomId: string) => {
    setExpandedRoomId((prev) => (prev === roomId ? null : roomId))
    setSelectedRoomMembers(new Set())
  }, [])

  const toggleRoomMemberSelection = useCallback((memberId: string) => {
    setSelectedRoomMembers((prev) => {
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
  const handleMoveToRoom = useCallback(
    async (targetRoom: Room) => {
      setIsMoving(true)
      setMoveError(null)
      try {
        await moveParticipantsToRoom(
          Array.from(selectedRoomMembers),
          targetRoom.id,
          targetRoom.roomNumber
        )
        await sync()
        setSelectedRoomMembers(new Set())
        setShowMoveToRoomModal(false)
      } catch (error) {
        setMoveError(error instanceof Error ? error.message : t('toast.moveParticipantFailed'))
      } finally {
        setIsMoving(false)
      }
    },
    [selectedRoomMembers, sync, t]
  )

  const openMoveModal = useCallback(() => {
    setMoveError(null)
    setShowMoveToRoomModal(true)
  }, [])

  const closeMoveModal = useCallback(() => {
    setShowMoveToRoomModal(false)
  }, [])

  return {
    // Expansion
    expandedRoomId,
    toggleRoomExpand,

    // Selection
    selectedRoomMembers,
    setSelectedRoomMembers,
    toggleRoomMemberSelection,

    // Modal
    showMoveToRoomModal,
    isMoving,
    moveError,
    setMoveError,
    handleMoveToRoom,
    openMoveModal,
    closeMoveModal,

    // Hover
    hoveredRoomId,
    setHoveredRoomId,

    // Helpers
    getRoomMembers
  }
}
