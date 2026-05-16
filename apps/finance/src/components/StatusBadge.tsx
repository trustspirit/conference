import { useTranslation } from 'react-i18next'
import { RequestStatus } from '../types'

const statusClass: Record<RequestStatus, string> = {
  pending: 'border-finance-border bg-finance-surface text-finance-body',
  reviewed: 'border-finance-border-hover bg-finance-primary-surface text-finance-primary',
  approved: 'border-finance-success-border bg-finance-success-bg text-finance-accent',
  rejected: 'border-finance-danger-border bg-finance-danger-bg text-finance-danger',
  settled: 'border-finance-border-hover bg-finance-primary-surface text-finance-primary',
  cancelled: 'border-finance-border bg-finance-neutral-subtle text-finance-muted',
  force_rejected: 'border-finance-danger-border bg-finance-danger-bg text-finance-danger'
}

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${statusClass[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  )
}
