import type { ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'danger'

const VARIANT_STYLES: Record<AlertVariant, { bg: string; border: string; color: string; icon: string }> = {
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'i' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: '\u2713' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '!' },
  error: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '\u2717' },
  danger: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '\u2717' },
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
}

export default function Alert({ variant = 'info', title, children }: AlertProps) {
  const s = VARIANT_STYLES[variant]

  return (
    <div
      style={{
        borderRadius: '0.75rem',
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
        padding: '0.75rem 1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1.25rem',
          height: '1.25rem',
          borderRadius: '9999px',
          backgroundColor: s.border,
          color: s.color,
          fontSize: '0.75rem',
          fontWeight: 700,
          flexShrink: 0,
          marginTop: '0.125rem',
        }}
      >
        {s.icon}
      </span>
      <div style={{ flex: 1 }}>
        {title && (
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: s.color, marginBottom: '0.25rem' }}>
            {title}
          </p>
        )}
        <div style={{ fontSize: '0.875rem', color: s.color, lineHeight: '1.4' }}>{children}</div>
      </div>
    </div>
  )
}
