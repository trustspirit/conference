import React from 'react'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-[#E7F3FF] text-[#1877F2]',
  secondary: 'bg-[#F0F2F5] text-[#65676B]',
  success: 'bg-[#EFFFF6] text-[#31A24C]',
  error: 'bg-[#FFEBEE] text-[#FA383E]',
  warning: 'bg-[#FFF8E1] text-[#F9A825]',
  info: 'bg-[#E7F3FF] text-[#1877F2]'
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm'
}

function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  className = ''
}: BadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
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
