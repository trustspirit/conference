import React from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from 'trust-ui-react'

interface LeaderBadgeProps {
  type: 'room' | 'group'
  className?: string
  size?: 'sm' | 'md'
}

function LeaderBadge({ type, className = '', size = 'sm' }: LeaderBadgeProps): React.ReactElement {
  const { t } = useTranslation()

  const typeConfig = {
    room: {
      icon: '\u{1F451}',
      label: t('room.leader'),
      variant: 'warning' as const
    },
    group: {
      icon: '\u2B50',
      label: t('group.leader'),
      variant: 'info' as const
    }
  }

  const config = typeConfig[type]

  return (
    <Badge variant={config.variant} size={size} className={className}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  )
}

export default LeaderBadge
