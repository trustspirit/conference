import { atom } from 'jotai'
import type { Participant, Group, Room } from '../types'
import {
  getAllParticipants,
  getAllGroups,
  getAllRooms,
  subscribeToParticipants,
  subscribeToGroups,
  subscribeToRooms,
  isFirebaseConfigured
} from '../services/firebase'
import { addToastAtom } from './toastStore'

export const participantsAtom = atom<Participant[]>([])
export const groupsAtom = atom<Group[]>([])
export const roomsAtom = atom<Room[]>([])
export const isLoadingAtom = atom(true)
export const isSyncingAtom = atom(false)
export const lastSyncTimeAtom = atom<Date | null>(null)

const unsubscribesAtom = atom<Array<() => void>>([])

let hasShownConnectionToast = false

export const syncAtom = atom(null, async (get, set, showToast: boolean = false) => {
  if (!isFirebaseConfigured()) {
    set(addToastAtom, { message: 'Firebase not configured', type: 'warning' })
    return
  }

  set(isSyncingAtom, true)
  const minDelay = new Promise((resolve) => setTimeout(resolve, 500))

  try {
    const [participantsData, groupsData, roomsData] = await Promise.all([
      getAllParticipants(),
      getAllGroups(),
      getAllRooms(),
      minDelay
    ])
    set(participantsAtom, participantsData)
    set(groupsAtom, groupsData)
    set(roomsAtom, roomsData)
    set(lastSyncTimeAtom, new Date())
    if (showToast) {
      set(addToastAtom, { message: 'Data synced successfully', type: 'success' })
    }
  } catch (error) {
    console.error('Sync error:', error)
    set(addToastAtom, {
      message: error instanceof Error ? error.message : 'Sync failed',
      type: 'error'
    })
  } finally {
    set(isSyncingAtom, false)
    set(isLoadingAtom, false)
  }
})

export const setupRealtimeListenersAtom = atom(null, (get, set) => {
  if (!isFirebaseConfigured()) return

  const existingUnsubs = get(unsubscribesAtom)
  if (existingUnsubs.length > 0) return

  try {
    const unsubParticipants = subscribeToParticipants((data) => {
      set(participantsAtom, data)
      set(lastSyncTimeAtom, new Date())
      set(isLoadingAtom, false)
    })

    const unsubGroups = subscribeToGroups((data) => {
      set(groupsAtom, data)
    })

    const unsubRooms = subscribeToRooms((data) => {
      set(roomsAtom, data)
    })

    set(unsubscribesAtom, [unsubParticipants, unsubGroups, unsubRooms])

    if (!hasShownConnectionToast) {
      hasShownConnectionToast = true
      set(addToastAtom, { message: 'Connected to database', type: 'info', duration: 2000 })
    }
  } catch (error) {
    console.error('Error setting up realtime listeners:', error)
    set(syncAtom)
  }
})

export const cleanupListenersAtom = atom(null, (get, set) => {
  const unsubscribes = get(unsubscribesAtom)
  unsubscribes.forEach((unsub) => unsub())
  set(unsubscribesAtom, [])
})
