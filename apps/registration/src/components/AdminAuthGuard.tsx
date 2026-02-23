import React, { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { authUserAtom, authLoadingAtom } from '../stores/authStore'
import { onAuthChange, signOut } from '../services/firebase'
import { isAdmin } from '../services/admins'
import { Spinner, Button } from './ui'
import AdminLoginPage from './AdminLoginPage'

function AdminAuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const { t } = useTranslation()
  const [user, setUser] = useAtom(authUserAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

  useEffect(() => {
    if (!user?.email) {
      setAuthorized(null)
      return
    }
    isAdmin(user.email).then(setAuthorized)
  }, [user])

  if (loading) return <Spinner />
  if (!user) return <AdminLoginPage />

  if (authorized === null) return <Spinner />

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm text-center">
          <p className="text-red-500 font-medium mb-2">{t('auth.notAuthorized')}</p>
          <p className="text-sm text-gray-500 mb-4">{user.email}</p>
          <Button variant="ghost" onClick={() => signOut()}>{t('common.signOut')}</Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AdminAuthGuard
