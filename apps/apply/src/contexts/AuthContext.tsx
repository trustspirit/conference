import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '@conference/firebase'
import { AppUser } from '../types'
import { APPLY_USERS_COLLECTION } from '../collections'
import i18n from '../lib/i18n'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  needsProfile: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateAppUser: (fields: Partial<AppUser>) => Promise<void>
  setNeedsProfile: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsProfile, setNeedsProfile] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, APPLY_USERS_COLLECTION, firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser
            setAppUser(data)
            setNeedsProfile(!data.role)
          } else {
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || '',
              role: null,
              leaderStatus: null,
              ward: '',
              stake: '',
              phone: '',
              picture: firebaseUser.photoURL || '',
            }
            await setDoc(doc(db, APPLY_USERS_COLLECTION, firebaseUser.uid), newUser)
            setAppUser(newUser)
            setNeedsProfile(true)
          }
        } else {
          setAppUser(null)
          setNeedsProfile(false)
        }
      } catch (error) {
        console.error('Auth state error:', error)
        setAppUser(null)
        setNeedsProfile(false)
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error: unknown) {
      console.error('Google sign-in error:', error)
      const firebaseError = error as { code?: string; message?: string }
      alert(`${i18n.t('auth.loginFailed')}: ${firebaseError.code || firebaseError.message}`)
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const updateAppUser = async (fields: Partial<AppUser>) => {
    if (!user) return
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      updateData[key] = value
    }
    await updateDoc(doc(db, APPLY_USERS_COLLECTION, user.uid), updateData)
    setAppUser((prev) => (prev ? { ...prev, ...fields } : prev))
  }

  return (
    <AuthContext.Provider
      value={{ user, appUser, loading, needsProfile, signInWithGoogle, logout, updateAppUser, setNeedsProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
