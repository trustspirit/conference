import { atom } from 'jotai'
import type { AppUser } from '../services/firebase'
import { authUserAtom } from './authStore'

// Derived: current user name from Firebase Auth
export const userNameAtom = atom<string | null>((get) => {
  const authUser = get(authUserAtom)
  return authUser?.displayName || authUser?.email || null
})

// List of all saved users from Firebase (kept for audit trail)
export const savedUsersAtom = atom<AppUser[]>([])

// Loading state for users
export const usersLoadingAtom = atom<boolean>(true)

// Update saved users list (called from Firebase subscription)
export const updateSavedUsersAtom = atom(null, (_get, set, users: AppUser[]) => {
  set(savedUsersAtom, users)
  set(usersLoadingAtom, false)
})
