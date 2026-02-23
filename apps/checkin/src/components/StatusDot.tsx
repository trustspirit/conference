import React from 'react'
import { CapacityStatus, RoomStatus } from '../types'

interface StatusDotProps {
  status: CapacityStatus | RoomStatus
  size?: 'sm' | 'md'
}

function StatusDot({ status, size = 'md' }: StatusDotProps): React.ReactElement {
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  const colorClasses = (() => {
    switch (status) {
      case CapacityStatus.Full:
      case RoomStatus.Full:
        return 'bg-[#FA383E]'
      case CapacityStatus.AlmostFull:
      case RoomStatus.AlmostFull:
        return 'bg-[#F57C00]'
      case CapacityStatus.Available:
      case RoomStatus.Available:
        return 'bg-[#31A24C]'
      case CapacityStatus.NoLimit:
        return 'bg-[#DADDE1]'
      default:
        return 'bg-[#DADDE1]'
    }
  })()

  return <div className={`${sizeClasses} rounded-full ${colorClasses}`} />
}

export function getCapacityStatus(current: number, max?: number): CapacityStatus {
  if (!max) return CapacityStatus.NoLimit
  const ratio = current / max
  if (ratio >= 1) return CapacityStatus.Full
  if (ratio >= 0.75) return CapacityStatus.AlmostFull
  return CapacityStatus.Available
}

export function getRoomStatus(currentOccupancy: number, maxCapacity: number): RoomStatus {
  const ratio = currentOccupancy / maxCapacity
  if (ratio >= 1) return RoomStatus.Full
  if (ratio >= 0.75) return RoomStatus.AlmostFull
  return RoomStatus.Available
}

export default StatusDot
