import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '../../stores/authStore'
import { signOut } from '../../services/firebase'
import { Button } from 'trust-ui-react'

function AdminNavbar(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAtomValue(authUserAtom)

  const links = [
    { path: '/admin', label: t('survey.title') },
    { path: '/admin/admins', label: t('admin.manageAdmins') },
  ]

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-lg font-bold text-primary cursor-pointer"
            onClick={() => navigate('/admin')}
          >
            {t('admin.title')}
          </h1>
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => {
              const active = location.pathname === link.path
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>{t('common.signOut')}</Button>
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar
