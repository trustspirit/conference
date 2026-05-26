import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  getRedirectResult,
  User
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
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
    let unsubscribeUserDoc: (() => void) | null = null

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Tear down any prior user-doc subscription when the auth user changes.
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc()
        unsubscribeUserDoc = null
      }
      try {
        setUser(firebaseUser)
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as AppUser
            setAppUser(data)
            setNeedsDisplayName(!data.displayName)
            setNeedsConsent(!!data.displayName && !data.consentAgreedAt)

            // Live-subscribe to role / profile changes so admin updates land
            // without requiring a refresh. Keep needs-* flags in sync too, otherwise
            // the displayName / consent modals can stay open after the underlying
            // field is populated by an admin or via a parallel tab.
            unsubscribeUserDoc = onSnapshot(
              doc(db, 'users', firebaseUser.uid),
              (snap) => {
                if (!snap.exists()) return
                const next = snap.data() as AppUser
                setAppUser(next)
                setNeedsDisplayName(!next.displayName)
                setNeedsConsent(!!next.displayName && !next.consentAgreedAt)
              }
            )
          } else {
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
              systemRole: 'member',
              assignedProjectCount: 0
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
            // No auto-add to default project — super_admin will assign explicitly.
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
    return () => {
      unsubscribe()
      if (unsubscribeUserDoc) unsubscribeUserDoc()
    }
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
