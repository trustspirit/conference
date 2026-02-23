import React, { useEffect } from 'react'
import { useAtom } from 'jotai'
import { authUserAtom, authLoadingAtom } from '../stores/authStore'
import { onAuthChange } from '../services/firebase'
import LoginPage from './LoginPage'

function AuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useAtom(authUserAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

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

  return <>{children}</>
}

export default AuthGuard
