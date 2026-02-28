import React from 'react'
import { Badge } from 'trust-ui-react'
import { CheckInStatus } from '../types'

interface CheckInStatusBadgeProps {
  status: CheckInStatus
}

function CheckInStatusBadge({ status }: CheckInStatusBadgeProps): React.ReactElement {
  if (status === CheckInStatus.CheckedIn) {
    return (
      <Badge variant="success" size="sm">
        Checked In
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" size="sm">
      Not Checked In
    </Badge>
  )
}

export function getCheckInStatusFromParticipant(
  checkIns: Array<{ checkOutTime?: Date }>
): CheckInStatus {
  const activeCheckIn = checkIns.find((ci) => !ci.checkOutTime)
  return activeCheckIn ? CheckInStatus.CheckedIn : CheckInStatus.NotCheckedIn
}

export default CheckInStatusBadge
