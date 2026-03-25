import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '@conference/firebase'
import { AppUser } from '../types'
import { INVENTORY_USERS_COLLECTION } from '../collections'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  needsConsent: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateAppUser: (fields: Partial<AppUser>) => Promise<void>
  setNeedsConsent: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsConsent, setNeedsConsent] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, INVENTORY_USERS_COLLECTION, firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser
            setAppUser(data)
            setNeedsConsent(!data.consentAgreedAt)
          } else {
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || '',
              role: 'viewer',
              projectIds: []
            }
            await setDoc(doc(db, INVENTORY_USERS_COLLECTION, firebaseUser.uid), newUser)
            setAppUser(newUser)
            setNeedsConsent(true)
          }
        } else {
          setAppUser(null)
          setNeedsConsent(false)
        }
      } catch (error) {
        console.error('Auth state error:', error)
        setAppUser(null)
        setNeedsConsent(false)
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error: unknown) {
      console.error('Google sign-in error:', error)
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
    await updateDoc(doc(db, INVENTORY_USERS_COLLECTION, user.uid), updateData)
    setAppUser((prev) => (prev ? { ...prev, ...fields } : prev))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        needsConsent,
        signInWithGoogle: handleSignIn,
        logout,
        updateAppUser,
        setNeedsConsent
      }}
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
