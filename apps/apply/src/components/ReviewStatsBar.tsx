import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from 'trust-ui-react'
import type { ReviewItem } from '../types'

interface ReviewStatsBarProps {
  items: ReviewItem[]
}

export default function ReviewStatsBar({ items }: ReviewStatsBarProps) {
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const approved = items.filter((it) => it.status === 'approved').length
    const awaiting = items.filter((it) => it.status === 'awaiting').length
    const rejected = items.filter((it) => it.status === 'rejected').length
    const total = items.length

    const stakeMap: Record<string, number> = {}
    items
      .filter((it) => it.status === 'approved')
      .forEach((it) => {
        const key = it.stake || 'Unknown'
        stakeMap[key] = (stakeMap[key] || 0) + 1
      })
    const stakeDistribution = Object.entries(stakeMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return { approved, awaiting, rejected, total, stakeDistribution }
  }, [items])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
          {t('admin.review.stats.approved', '승인')}:
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
          {stats.approved}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          / {stats.total}{t('admin.review.stats.total', '건')}
        </span>
      </div>

      <div style={{ width: '1px', height: '1.25rem', backgroundColor: '#d1d5db' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Badge variant="warning" size="sm">{t('admin.review.stats.awaiting', '대기')} {stats.awaiting}</Badge>
        <Badge variant="danger" size="sm">{t('admin.review.stats.rejected', '거절')} {stats.rejected}</Badge>
      </div>

      {stats.stakeDistribution.length > 0 && (
        <>
          <div style={{ width: '1px', height: '1.25rem', backgroundColor: '#d1d5db' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
            {stats.stakeDistribution.map(({ name, count }) => (
              <Badge key={name} variant="secondary" size="sm">
                {name} {count}
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
