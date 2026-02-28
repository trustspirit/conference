import { useTranslation } from 'react-i18next'
import { Menu, Badge } from 'trust-ui-react'
import { useConference } from '../contexts/ConferenceContext'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole } from '../lib/roles'
import { ChevronDownIcon } from './Icons'

export default function ConferenceSelector() {
  const { t } = useTranslation()
  const { currentConference, conferences, setCurrentConference } = useConference()
  const { appUser } = useAuth()

  const isAdmin = isAdminRole(appUser?.role)

  if (conferences.length === 0) return null
  // 대회가 1개이고 admin이 아니면 숨김
  if (conferences.length <= 1 && !isAdmin) return null

  return (
    <Menu>
      <Menu.Trigger>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#2563eb',
            whiteSpace: 'nowrap',
          }}
        >
          {currentConference?.name || t('conference.all', '전체 대회')}
          <ChevronDownIcon style={{ width: '0.875rem', height: '0.875rem', color: '#2563eb' }} />
        </button>
      </Menu.Trigger>
      <Menu.Content>
        {isAdmin && (
          <Menu.Item onClick={() => setCurrentConference(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{t('conference.all', '전체 대회')}</span>
              {currentConference === null && (
                <Badge variant="primary" size="sm">
                  {t('conference.current', '현재')}
                </Badge>
              )}
            </div>
          </Menu.Item>
        )}
        {conferences.map((conference) => (
          <Menu.Item
            key={conference.id}
            onClick={() => setCurrentConference(conference)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{conference.name}</span>
              {conference.id === currentConference?.id && (
                <Badge variant="primary" size="sm">
                  {t('conference.current', '현재')}
                </Badge>
              )}
            </div>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  )
}
