import type { ReactNode } from 'react'

interface DetailItem {
  label: string
  value: ReactNode
}

interface DetailsGridProps {
  items: DetailItem[]
  columns?: 1 | 2
}

export default function DetailsGrid({ items, columns = 2 }: DetailsGridProps) {
  return (
    <div
      className={columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'}
    >
      {items.map((item, i) => (
        <div key={i}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.25rem' }}>
            {item.label}
          </p>
          <div style={{ fontSize: '0.875rem', color: '#111827' }}>
            {item.value != null && item.value !== '' ? item.value : '-'}
          </div>
        </div>
      ))}
    </div>
  )
}
