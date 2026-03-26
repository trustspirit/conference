import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  getRedirectResult,
  User
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, googleProvider, db } from '@conference/firebase'
import { useToast } from 'trust-ui-react'
import i18n from '../lib/i18n'
import { AppUser } from '../types'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  needsDisplayName: boolean
  needsConsent: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateAppUser: (fields: Partial<AppUser>) => Promise<void>
  setNeedsDisplayName: (v: boolean) => void
  setNeedsConsent: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsDisplayName, setNeedsDisplayName] = useState(false)
  const [needsConsent, setNeedsConsent] = useState(false)

  useEffect(() => {
    getRedirectResult(auth).catch(() => {
      // Redirect result already consumed or no redirect happened
    })
  }, [])

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
            setNeedsConsent(!!data.displayName && !data.consentAgreedAt)
          } else {
            // Get default project ID
            let defaultProjectIds: string[] = []
            try {
              const globalSnap = await getDoc(doc(db, 'settings', 'global'))
              if (globalSnap.exists()) {
                const defaultPid = globalSnap.data().defaultProjectId
                if (defaultPid) defaultProjectIds = [defaultPid]
              }
            } catch {
              /* ignore */
            }

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
              projectIds: defaultProjectIds
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser)

            // Add user to default project's memberUids
            if (defaultProjectIds[0]) {
              try {
                await updateDoc(doc(db, 'projects', defaultProjectIds[0]), {
                  memberUids: arrayUnion(firebaseUser.uid)
                })
              } catch {
                /* project may not exist yet */
              }
            }
            setAppUser(newUser)
            setNeedsDisplayName(true)
            setNeedsConsent(false)
          }
        } else {
          setAppUser(null)
          setNeedsDisplayName(false)
          setNeedsConsent(false)
        }
      } catch (error) {
        console.error('Auth state error:', error)
        setAppUser(null)
        setNeedsDisplayName(false)
        setNeedsConsent(false)
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
      // If popup was blocked or closed, fall back to redirect
      if (
        firebaseError.code === 'auth/popup-blocked' ||
        firebaseError.code === 'auth/popup-closed-by-user'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider)
          return
        } catch {
          // redirect also failed
        }
      }
      toastRef.current({
        variant: 'danger',
        message: `${i18n.t('auth.loginFailed')}: ${firebaseError.code || firebaseError.message}`
      })
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const updateAppUser = async (fields: Partial<AppUser>) => {
    if (!user) return
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updateData[key] = value
    }
    await updateDoc(doc(db, 'users', user.uid), updateData)
    setAppUser((prev) => {
      if (!prev) return prev
      const filtered = { ...prev }
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) (filtered as Record<string, unknown>)[key] = value
      }
      return filtered as AppUser
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        needsDisplayName,
        needsConsent,
        signInWithGoogle,
        logout,
        updateAppUser,
        setNeedsDisplayName,
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
