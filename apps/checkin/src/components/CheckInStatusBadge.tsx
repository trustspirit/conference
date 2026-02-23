import React from 'react'
import { CheckInStatus } from '../types'

interface CheckInStatusBadgeProps {
  status: CheckInStatus
}

function CheckInStatusBadge({ status }: CheckInStatusBadgeProps): React.ReactElement {
  if (status === CheckInStatus.CheckedIn) {
    return (
      <span className="px-2 py-1 bg-[#EFFFF6] text-[#31A24C] rounded-md text-xs font-semibold">
        Checked In
      </span>
    )
  }

  return (
    <span className="px-2 py-1 bg-[#F0F2F5] text-[#65676B] rounded-md text-xs font-semibold">
      Not Checked In
    </span>
  )
}

export function getCheckInStatusFromParticipant(
  checkIns: Array<{ checkOutTime?: Date }>
): CheckInStatus {
  const activeCheckIn = checkIns.find((ci) => !ci.checkOutTime)
  return activeCheckIn ? CheckInStatus.CheckedIn : CheckInStatus.NotCheckedIn
}

export default CheckInStatusBadge
