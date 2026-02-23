import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { USERS_COLLECTION } from './collections'

export interface AppUser {
  id: string
  name: string
  createdAt: Date
  lastUsedAt: Date
}

/**
 * Fetch all saved users from Firestore
 */
export async function fetchUsers(): Promise<AppUser[]> {

  const usersRef = collection(db, USERS_COLLECTION)
  const q = query(usersRef, orderBy('lastUsedAt', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      name: data.name,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastUsedAt: data.lastUsedAt?.toDate() || new Date()
    }
  })
}

/**
 * Add or update a user in Firestore
 */
export async function saveUser(name: string): Promise<AppUser> {

  const usersRef = collection(db, USERS_COLLECTION)

  // Use name as document ID (normalized)
  const docId = name.toLowerCase().replace(/\s+/g, '_')
  const userRef = doc(usersRef, docId)

  // Update name and lastUsedAt, set createdAt only if new
  await setDoc(
    userRef,
    {
      name,
      lastUsedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  )

  return {
    id: docId,
    name,
    createdAt: new Date(),
    lastUsedAt: new Date()
  }
}

/**
 * Remove a user from Firestore
 */
export async function removeUser(userId: string): Promise<void> {

  const userRef = doc(db, USERS_COLLECTION, userId)
  await deleteDoc(userRef)
}

/**
 * Subscribe to real-time user updates
 */
export function subscribeToUsers(callback: (users: AppUser[]) => void): () => void {

  const usersRef = collection(db, USERS_COLLECTION)
  const q = query(usersRef, orderBy('lastUsedAt', 'desc'))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUsedAt: data.lastUsedAt?.toDate() || new Date()
      }
    })
    callback(users)
  })

  return unsubscribe
}
