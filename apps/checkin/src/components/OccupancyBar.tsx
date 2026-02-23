import React from 'react'
import { RoomStatus } from '../types'

interface OccupancyBarProps {
  current: number
  max: number
  showLabel?: boolean
}

function OccupancyBar({ current, max, showLabel = true }: OccupancyBarProps): React.ReactElement {
  const percent = Math.min((current / max) * 100, 100)
  const isFull = current >= max
  const isAlmostFull = percent > 75

  const barColor = isFull ? 'bg-[#FA383E]' : isAlmostFull ? 'bg-yellow-500' : 'bg-[#31A24C]'

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      {showLabel && (
        <span className="text-sm text-[#65676B]">
          {current} / {max}
        </span>
      )}
    </div>
  )
}

export function getOccupancyColorClasses(status: RoomStatus): string {
  switch (status) {
    case RoomStatus.Full:
      return 'bg-[#FFEBEE] text-[#FA383E]'
    case RoomStatus.AlmostFull:
      return 'bg-[#FFF3E0] text-[#F57C00]'
    case RoomStatus.Available:
      return 'bg-[#EFFFF6] text-[#31A24C]'
    default:
      return 'bg-[#F0F2F5] text-[#65676B]'
  }
}

export default OccupancyBar
