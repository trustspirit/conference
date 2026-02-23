import { atom } from 'jotai'
import type { User } from '@/services/firebase'

export const authUserAtom = atom<User | null>(null)
export const authLoadingAtom = atom<boolean>(true)
