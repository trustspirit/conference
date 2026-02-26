import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteField,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { USERS_COLLECTION } from './collections'

export type UserRole = 'admin' | 'staff'

export interface AppUser {
  uid: string
  email: string
  name: string
  photoURL: string
  role?: UserRole
  createdAt?: Date
}

export async function getUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION))
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      uid: docSnap.id,
      email: data.email || '',
      name: data.name || '',
      photoURL: data.photoURL || '',
      role: data.role as UserRole | undefined,
      createdAt: data.createdAt?.toDate?.() || undefined,
    }
  })
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('email', '==', email.toLowerCase().trim())
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  const data = docSnap.data()
  return {
    uid: docSnap.id,
    email: data.email || '',
    name: data.name || '',
    photoURL: data.photoURL || '',
    role: data.role as UserRole | undefined,
    createdAt: data.createdAt?.toDate?.() || undefined,
  }
}

export async function getUserRole(email: string): Promise<UserRole | null> {
  const user = await getUserByEmail(email)
  return user?.role ?? null
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) throw new Error('User not found')
  await updateDoc(userRef, { role })
}

export async function removeUserRole(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid)
  await updateDoc(userRef, { role: deleteField() })
}
