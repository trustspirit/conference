import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, googleProvider, db } from '@conference/firebase'
import i18n from '../lib/i18n'
import { AppUser } from '../types'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  needsDisplayName: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateAppUser: (fields: Partial<AppUser>) => Promise<void>
  setNeedsDisplayName: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsDisplayName, setNeedsDisplayName] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser
            setAppUser(data)
            setNeedsDisplayName(!data.displayName)
          } else {
            // Get default project ID
            let defaultProjectIds: string[] = []
            try {
              const globalSnap = await getDoc(doc(db, 'settings', 'global'))
              if (globalSnap.exists()) {
                const defaultPid = globalSnap.data().defaultProjectId
                if (defaultPid) defaultProjectIds = [defaultPid]
              }
            } catch { /* ignore */ }

            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || '',
              displayName: '',
              phone: '',
              bankName: '',
              bankAccount: '',
              defaultCommittee: 'operations',
              signature: '',
              bankBookImage: '',
              bankBookPath: '',
              bankBookUrl: '',
              role: 'user',
              projectIds: defaultProjectIds,
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser)

            // Add user to default project's memberUids
            if (defaultProjectIds[0]) {
              try {
                await updateDoc(doc(db, 'projects', defaultProjectIds[0]), {
                  memberUids: arrayUnion(firebaseUser.uid),
                })
              } catch { /* project may not exist yet */ }
            }
            setAppUser(newUser)
            setNeedsDisplayName(true)
          }
        } else {
          setAppUser(null)
          setNeedsDisplayName(false)
        }
      } catch (error) {
        console.error('Auth state error:', error)
        setAppUser(null)
        setNeedsDisplayName(false)
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
    await updateDoc(doc(db, 'users', user.uid), updateData)
    setAppUser((prev) => prev ? { ...prev, ...fields } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, needsDisplayName, signInWithGoogle, logout, updateAppUser, setNeedsDisplayName }}>
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
