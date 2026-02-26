import React, { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { authUserAtom, authLoadingAtom, userRoleAtom } from '../stores/authStore'
import { onAuthChange, signOut, db } from '../services/firebase'
import { getUserRole } from '../services/admins'
import LoginPage from './LoginPage'

function AuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useAtom(authUserAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)
  const [, setUserRole] = useAtom(userRoleAtom)
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

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
    getUserRole(user.email).then(async (role) => {
      if (cancelled) return
      setIsAuthorized(role !== null)
      setUserRole(role)
      setAdminChecked(true)

      // Create user document in Firestore if it doesn't exist
      if (role !== null) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || '',
              photoURL: user.photoURL || '',
            })
          }
        } catch (err) {
          console.error('Failed to create user document:', err)
        }
      }
    })
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
            관리자 페이지에 접근할 수 없는 계정입니다.
          </p>
          <p className="text-[#65676B] text-sm mb-6">
            {user.email}
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-3 bg-[#E4E6EB] text-[#050505] rounded-lg font-semibold hover:bg-[#D8DADF] transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthGuard
