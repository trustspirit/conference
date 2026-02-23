import React from 'react'
import type { Participant } from '../types'
import QRCodeDisplay from './QRCodeDisplay'

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
  return (
    <QRCodeDisplay
      participantId={participant.id}
      participantName={participant.name}
      size={size}
      showDownload={showDownload}
      showPrint={showPrint}
    />
  )
}

export default ParticipantQRCode
