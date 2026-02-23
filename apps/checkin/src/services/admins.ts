import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

const ADMINS_COLLECTION = 'checkin_admins'

export interface AdminEntry {
  email: string
  addedAt: Date
}

export const getAdmins = async (): Promise<AdminEntry[]> => {
  const snapshot = await getDocs(collection(db, ADMINS_COLLECTION))
  return snapshot.docs.map((d) => ({
    email: d.id,
    addedAt: d.data().addedAt?.toDate?.() || new Date(),
  }))
}

export const isAdmin = async (email: string): Promise<boolean> => {
  const admins = await getAdmins()
  // If no admins exist yet, allow anyone (first-time setup)
  if (admins.length === 0) return true
  return admins.some((a) => a.email.toLowerCase() === email.toLowerCase())
}

export const addAdmin = async (email: string): Promise<void> => {
  const normalized = email.toLowerCase().trim()
  await setDoc(doc(db, ADMINS_COLLECTION, normalized), {
    addedAt: new Date(),
  })
}

export const removeAdmin = async (email: string): Promise<void> => {
  await deleteDoc(doc(db, ADMINS_COLLECTION, email.toLowerCase().trim()))
}
