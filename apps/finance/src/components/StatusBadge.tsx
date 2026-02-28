import { useTranslation } from 'react-i18next'
import { Badge } from 'trust-ui-react'
import { RequestStatus } from '../types'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'

const statusVariant: Record<RequestStatus, BadgeVariant> = {
  pending: 'warning',
  reviewed: 'info',
  approved: 'success',
  rejected: 'danger',
  settled: 'primary',
  cancelled: 'secondary',
  force_rejected: 'danger',
}

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useTranslation()
  return (
    <Badge variant={statusVariant[status]}>
      {t(`status.${status}`)}
    </Badge>
  )
}
