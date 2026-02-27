import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole, isLeaderRole } from '../lib/roles'
import { ROUTES } from '../utils/constants'

interface NavItem {
  to: string
  label: string
}

export default function AppNav() {
  const { t } = useTranslation()
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const role = appUser?.role

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

  navItems.push(
    { to: ROUTES.ACCOUNT_SETTINGS, label: t('navigation.accountSettings', '계정 설정') },
  )

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-sm rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-700 font-medium'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`

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
        <button
          onClick={handleLogout}
          className="shrink-0 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          {t('navigation.signOut', '로그아웃')}
        </button>
      </div>
    </nav>
  )
}
