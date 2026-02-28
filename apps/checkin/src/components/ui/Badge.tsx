import React from 'react'
import { Badge as TrustBadge } from 'trust-ui-react'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

const variantMap: Record<BadgeVariant, 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'> = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info'
}

function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  className
}: BadgeProps): React.ReactElement {
  return (
    <TrustBadge
      variant={variantMap[variant]}
      size={size}
      className={className}
    >
      {children}
    </TrustBadge>
  )
}

export function StatusBadge({ isCheckedIn }: { isCheckedIn: boolean }): React.ReactElement {
  return (
    <Badge variant={isCheckedIn ? 'success' : 'secondary'} size="sm">
      {isCheckedIn ? 'Checked In' : 'Not Checked In'}
    </Badge>
  )
}

export function RoomStatusBadge({ isFull }: { isFull: boolean }): React.ReactElement {
  return (
    <Badge variant={isFull ? 'error' : 'success'} size="sm">
      {isFull ? 'Full' : 'Available'}
    </Badge>
  )
}

export default Badge
