import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

const ADMINS_COLLECTION = 'checkin_admins'

export type UserRole = 'admin' | 'staff'

export interface AdminEntry {
  email: string
  role: UserRole
  addedAt: Date
}

export const getAdmins = async (): Promise<AdminEntry[]> => {
  const snapshot = await getDocs(collection(db, ADMINS_COLLECTION))
  return snapshot.docs.map((d) => ({
    email: d.id,
    role: (d.data().role as UserRole) || 'admin',
    addedAt: d.data().addedAt?.toDate?.() || new Date(),
  }))
}

export const getUserRole = async (email: string): Promise<UserRole | null> => {
  const docRef = doc(db, ADMINS_COLLECTION, email.toLowerCase().trim())
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return (docSnap.data().role as UserRole) || 'admin'
}

export const isAuthorized = async (email: string): Promise<boolean> => {
  const role = await getUserRole(email)
  return role !== null
}

export const isAdmin = async (email: string): Promise<boolean> => {
  const role = await getUserRole(email)
  return role === 'admin'
}

export const addUser = async (email: string, role: UserRole): Promise<void> => {
  const normalized = email.toLowerCase().trim()
  await setDoc(doc(db, ADMINS_COLLECTION, normalized), {
    role,
    addedAt: new Date(),
  })
}

export const removeUser = async (email: string): Promise<void> => {
  const admins = await getAdmins()
  const adminCount = admins.filter((a) => a.role === 'admin').length
  const target = admins.find((a) => a.email === email.toLowerCase().trim())
  if (target?.role === 'admin' && adminCount <= 1) {
    throw new Error('최소 1명의 관리자가 필요합니다.')
  }
  await deleteDoc(doc(db, ADMINS_COLLECTION, email.toLowerCase().trim()))
}

// Backward compatibility
export const addAdmin = (email: string) => addUser(email, 'admin')
export const removeAdmin = removeUser
