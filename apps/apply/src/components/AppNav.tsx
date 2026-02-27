import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole, isLeaderRole } from '../lib/roles'
import { ROUTES } from '../utils/constants'
import { getRoleTone } from '../utils/constants'
import StatusChip from './StatusChip'
import { ROLE_LABELS } from '../utils/roleConfig'

interface NavItem {
  to: string
  label: string
}

export default function AppNav() {
  const { t, i18n } = useTranslation()
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const role = appUser?.role
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems: NavItem[] = []

  if (isAdminRole(role)) {
    navItems.push(
      { to: ROUTES.ADMIN_DASHBOARD, label: t('navigation.dashboard', '대시보드') },
      { to: ROUTES.ADMIN_REVIEW, label: t('navigation.reviewApplications', '신청서 검토') },
      { to: ROUTES.ADMIN_ROLES, label: t('navigation.manageRoles', '역할 관리') },
    )
  }

  if (isLeaderRole(role) || isAdminRole(role)) {
    navItems.push(
      { to: ROUTES.LEADER_DASHBOARD, label: t('navigation.leaderDashboard', '리더 대시보드') },
      { to: ROUTES.LEADER_RECOMMENDATIONS, label: t('navigation.recommendations', '추천서') },
    )
  }

  if (role === 'applicant') {
    navItems.push(
      { to: ROUTES.APPLICATION, label: t('navigation.application', '신청서') },
    )
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(newLang)
    localStorage.setItem('apply-language', newLang)
    setMenuOpen(false)
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-blue-100 text-blue-700 font-medium'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`

  const roleLabelKey = role ? ROLE_LABELS[role] : ''
  const roleTone = getRoleTone(role)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-lg font-bold text-blue-600 mr-4 shrink-0">Apply</span>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkStyle}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right: user info + dropdown */}
        <div className="flex items-center gap-3 shrink-0" ref={menuRef}>
          {role && (
            <StatusChip label={t(roleLabelKey)} tone={roleTone} size="sm" />
          )}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            >
              {appUser?.picture ? (
                <img
                  src={appUser.picture}
                  alt=""
                  style={{ width: '1.75rem', height: '1.75rem', borderRadius: '9999px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '9999px',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7280',
                  }}
                >
                  {(appUser?.name || '?')[0].toUpperCase()}
                </div>
              )}
              <svg
                style={{
                  width: '1rem',
                  height: '1rem',
                  color: '#6b7280',
                  transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.25rem',
                  width: '12rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{appUser?.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appUser?.email}</p>
                </div>
                <button
                  onClick={() => { navigate(ROUTES.ACCOUNT_SETTINGS); setMenuOpen(false) }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {t('navigation.accountSettings', '계정 설정')}
                </button>
                <button
                  onClick={toggleLanguage}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <span>{t('navigation.language', '언어')}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {i18n.language === 'ko' ? 'English' : '한국어'}
                  </span>
                </button>
                <div style={{ borderTop: '1px solid #f3f4f6' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: '#dc2626',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    {t('navigation.signOut', '로그아웃')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
