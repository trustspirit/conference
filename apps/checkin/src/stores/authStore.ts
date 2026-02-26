import { atom } from 'jotai'
import type { User } from '@conference/firebase'
import type { UserRole } from '../services/firebase/users'

export const authUserAtom = atom<User | null>(null)
export const authLoadingAtom = atom<boolean>(true)
export const userRoleAtom = atom<UserRole | null>(null)
