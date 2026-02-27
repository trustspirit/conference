type Color = 'gray' | 'yellow' | 'green' | 'red' | 'blue' | 'purple'

const COLOR_MAP: Record<Color, { bg: string; border: string; accent: string }> = {
  gray: { bg: '#f9fafb', border: '#e5e7eb', accent: '#6b7280' },
  yellow: { bg: '#fffbeb', border: '#fde68a', accent: '#d97706' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a' },
  red: { bg: '#fef2f2', border: '#fecaca', accent: '#dc2626' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb' },
  purple: { bg: '#faf5ff', border: '#e9d5ff', accent: '#7c3aed' },
}

interface SummaryCardProps {
  label: string
  value: number
  color?: Color
  onClick?: () => void
}

export default function SummaryCard({ label, value, color = 'gray', onClick }: SummaryCardProps) {
  const c = COLOR_MAP[color]
  const isClickable = !!onClick

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
      style={{
        borderRadius: '0.75rem',
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        padding: '1.25rem 1.5rem',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</p>
        {isClickable && (
          <span style={{ fontSize: '1rem', color: '#9ca3af', lineHeight: 1 }}>&rarr;</span>
        )}
      </div>
      <p style={{ fontSize: '1.875rem', fontWeight: 700, color: c.accent }}>{value}</p>
    </div>
  )
}
