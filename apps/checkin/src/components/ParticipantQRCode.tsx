import React, { useEffect, useState } from 'react'
import type { Participant } from '../types'
import QRCodeDisplay from './QRCodeDisplay'
import { generateKeyFromParticipant } from '../utils/generateParticipantKey'

interface ParticipantQRCodeProps {
  participant: Participant
  size?: number
  showDownload?: boolean
  showPrint?: boolean
}

function ParticipantQRCode({
  participant,
  size = 140,
  showDownload = true,
  showPrint = true
}: ParticipantQRCodeProps): React.ReactElement {
  const [participantKey, setParticipantKey] = useState<string | null>(null)

  useEffect(() => {
    if (participant.name && participant.birthDate) {
      generateKeyFromParticipant(participant.name, participant.birthDate).then(setParticipantKey)
    }
  }, [participant.name, participant.birthDate])

  return (
    <QRCodeDisplay
      participantKey={participantKey}
      participantName={participant.name}
      size={size}
      showDownload={showDownload}
      showPrint={showPrint}
    />
  )
}

export default ParticipantQRCode
