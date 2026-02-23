import React from 'react'
import { useTranslation } from 'react-i18next'

interface LeaderBadgeProps {
  type: 'room' | 'group'
  className?: string
  size?: 'sm' | 'md'
}

function LeaderBadge({ type, className = '', size = 'sm' }: LeaderBadgeProps): React.ReactElement {
  const { t } = useTranslation()

  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'

  const typeConfig = {
    room: {
      icon: '👑',
      label: t('room.leader'),
      bgClass: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    group: {
      icon: '⭐',
      label: t('group.leader'),
      bgClass: 'bg-purple-100 text-purple-800 border-purple-300'
    }
  }

  const config = typeConfig[type]

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sizeClasses} font-semibold rounded-full border ${config.bgClass} ${className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

export default LeaderBadge
