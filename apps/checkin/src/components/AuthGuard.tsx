import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAtom } from 'jotai'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { Checkbox } from 'trust-ui-react'
import { authUserAtom, authLoadingAtom, userRoleAtom } from '../stores/authStore'
import { onAuthChange, signOut, db } from '../services/firebase'
import { getUserRole } from '../services/firebase'
import LoginPage from './LoginPage'

function AuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const { t } = useTranslation()
  const [user, setUser] = useAtom(authUserAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)
  const [, setUserRole] = useAtom(userRoleAtom)
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [needsConsent, setNeedsConsent] = useState(false)
  const [consentAgreed, setConsentAgreed] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (!firebaseUser) {
        setAdminChecked(false)
        setIsAuthorized(false)
        setUserRole(null)
      }
    })
    return () => unsubscribe()
  }, [setUser, setLoading, setUserRole])

  useEffect(() => {
    if (!user?.email) {
      setAdminChecked(false)
      setIsAuthorized(false)
      setUserRole(null)
      return
    }
    let cancelled = false
    setAdminChecked(false)

    const init = async () => {
      // Create user document first (before role check) so admins can assign roles later
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || '',
            photoURL: user.photoURL || '',
          })
          setNeedsConsent(true)
        } else {
          const data = userDoc.data()
          setNeedsConsent(!data.consentAgreedAt)
        }
      } catch (err) {
        console.error('Failed to create user document:', err)
      }

      const role = await getUserRole(user.email!)
      if (cancelled) return
      setIsAuthorized(role !== null)
      setUserRole(role)
      setAdminChecked(true)
    }

    init()
    return () => { cancelled = true }
  }, [user, setUserRole])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (!adminChecked) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#FFF3CD] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#856404]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-[#050505] font-medium mb-2">
            {t('auth.notAuthorized')}
          </p>
          <p className="text-[#65676B] text-sm mb-6">
            {user.email}
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-3 bg-[#E4E6EB] text-[#050505] rounded-lg font-semibold hover:bg-[#D8DADF] transition-colors"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </div>
    )
  }

  if (needsConsent) {
    const handleConsentSubmit = async () => {
      if (!user) return
      setConsentSaving(true)
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          consentAgreedAt: new Date().toISOString(),
        })
        setNeedsConsent(false)
      } catch (err) {
        console.error('Failed to save consent:', err)
      } finally {
        setConsentSaving(false)
      }
    }

    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md space-y-5">
          <h2 className="text-lg font-bold text-[#050505]">
            {t('consent.title')}
          </h2>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {t('consent.agreement')}
            </p>
          </div>

          <Checkbox
            checked={consentAgreed}
            onChange={(e) => setConsentAgreed(e.target.checked)}
            label={t('consent.checkboxLabel')}
          />

          <div className="flex gap-3">
            <button
              onClick={() => signOut()}
              className="flex-1 py-3 bg-[#E4E6EB] text-[#050505] rounded-lg font-semibold hover:bg-[#D8DADF] transition-colors"
            >
              {t('auth.signOut')}
            </button>
            <button
              onClick={handleConsentSubmit}
              disabled={!consentAgreed || consentSaving}
              className="flex-1 py-3 bg-[#1877F2] text-white rounded-lg font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
            >
              {consentSaving ? '...' : t('consent.confirm')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGuard
