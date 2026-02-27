const TONE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  draft: { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
  awaiting: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  approved: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
  rejected: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  submitted: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  pending: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  admin: { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe' },
  sessionLeader: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  stakePresident: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
  bishop: { bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8' },
  applicant: { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
}

interface StatusChipProps {
  label: string
  tone?: string
  size?: 'sm' | 'md'
}

export default function StatusChip({ label, tone = 'draft', size = 'sm' }: StatusChipProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.draft
  const isSmall = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        border: `1px solid ${styles.border}`,
        backgroundColor: styles.bg,
        color: styles.color,
        fontSize: isSmall ? '0.75rem' : '0.8125rem',
        fontWeight: 500,
        padding: isSmall ? '0.125rem 0.5rem' : '0.25rem 0.75rem',
        lineHeight: '1.25rem',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
