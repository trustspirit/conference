import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { participantsAtom, groupsAtom, roomsAtom, isLoadingAtom } from '../stores/dataStore'
import type { TabType } from '../types'

export function useParticipantsListPage() {
  // Atoms - shared data
  const allParticipants = useAtomValue(participantsAtom)
  const groups = useAtomValue(groupsAtom)
  const rooms = useAtomValue(roomsAtom)
  const isLoading = useAtomValue(isLoadingAtom)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('participants')

  // Tabs configuration
  const tabs = [
    { id: 'participants' as TabType, label: 'Participants', count: allParticipants.length },
    { id: 'groups' as TabType, label: 'Groups', count: groups.length },
    { id: 'rooms' as TabType, label: 'Rooms', count: rooms.length }
  ]

  return {
    isLoading,
    activeTab,
    setActiveTab,
    tabs
  }
}
