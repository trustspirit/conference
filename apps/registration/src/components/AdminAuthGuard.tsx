import React, { useEffect } from 'react'
import { useAtom } from 'jotai'
import { authUserAtom, authLoadingAtom } from '../stores/authStore'
import { onAuthChange } from '../services/firebase'
import AdminLoginPage from './AdminLoginPage'

function AdminAuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AdminLoginPage />

  return <>{children}</>
}

export default AdminAuthGuard
