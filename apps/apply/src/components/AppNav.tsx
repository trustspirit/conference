import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole, isLeaderRole } from '../lib/roles'
import { ROUTES } from '../utils/constants'
import { getRoleTone } from '../utils/constants'
import { Badge, Avatar, Menu } from 'trust-ui-react'
import { ROLE_LABELS } from '../utils/roleConfig'
import { ChevronDownIcon } from './Icons'
import ConferenceSelector from './ConferenceSelector'

const TONE_TO_BADGE_VARIANT: Record<string, 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'> = {
  admin: 'primary',
  sessionLeader: 'info',
  stakePresident: 'success',
  bishop: 'secondary',
  applicant: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  draft: 'secondary',
  submitted: 'info',
  awaiting: 'warning',
}

interface NavItem {
  to: string
  label: string
}

export default function AppNav() {
  const { t, i18n } = useTranslation()
  const { appUser, logout } = useAuth()
  const navigate = useNavigate()
  const role = appUser?.role

  const navItems: NavItem[] = []

  if (isAdminRole(role)) {
    navItems.push(
      { to: ROUTES.ADMIN_DASHBOARD, label: t('navigation.dashboard', '대시보드') },
      { to: ROUTES.ADMIN_REVIEW, label: t('navigation.reviewApplications', '신청서 검토') },
      { to: ROUTES.ADMIN_ROLES, label: t('navigation.manageRoles', '역할 관리') },
      { to: ROUTES.ADMIN_SETTINGS, label: t('navigation.settings', '설정') },
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
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(newLang)
    localStorage.setItem('apply-language', newLang)
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
          <span className="text-lg font-bold text-blue-600 mr-2 shrink-0">Apply</span>
          <ConferenceSelector />
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkStyle}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right: user info + dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          {role && (
            <Badge variant={TONE_TO_BADGE_VARIANT[roleTone] || 'secondary'} size="sm">
              {t(roleLabelKey)}
            </Badge>
          )}
          <Menu>
            <Menu.Trigger>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
                <Avatar
                  src={appUser?.picture}
                  name={appUser?.name || '?'}
                  size="sm"
                />
                <ChevronDownIcon style={{ color: '#6b7280' }} />
              </button>
            </Menu.Trigger>
            <Menu.Content align="end">
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{appUser?.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '10rem' }}>{appUser?.email}</p>
              </div>
              <Menu.Item onClick={() => navigate(ROUTES.ACCOUNT_SETTINGS)}>
                {t('navigation.accountSettings', '계정 설정')}
              </Menu.Item>
              <Menu.Item onClick={toggleLanguage}>
                {t('navigation.language', '언어')} ({i18n.language === 'ko' ? 'English' : '한국어'})
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item danger onClick={handleLogout}>
                {t('navigation.signOut', '로그아웃')}
              </Menu.Item>
            </Menu.Content>
          </Menu>
        </div>
      </div>
    </nav>
  )
}
