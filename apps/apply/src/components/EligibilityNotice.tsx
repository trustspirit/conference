import { useTranslation } from 'react-i18next'
import { useConference } from '../contexts/ConferenceContext'

export default function EligibilityNotice() {
  const { t } = useTranslation()
  const { currentConference } = useConference()

  const requirements = currentConference?.eligibilityRequirements || []
  if (requirements.length === 0) return null

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: '0.75rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
      }}
    >
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem' }}>
        {t('eligibility.title', '자격 요건')}
      </p>
      <p style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.5rem' }}>
        {t('eligibility.description', '아래 요건을 충족하는 분만 신청/추천할 수 있습니다.')}
      </p>
      <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {requirements.map((req, i) => (
          <li key={i} style={{ fontSize: '0.8125rem', color: '#1e40af', marginBottom: '0.25rem' }}>
            {req}
          </li>
        ))}
      </ul>
    </div>
  )
}
