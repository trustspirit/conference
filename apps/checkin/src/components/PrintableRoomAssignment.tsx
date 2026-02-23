import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Room, Participant } from '../types'
import { formatPhoneNumber } from '../utils/phoneFormat'

interface PrintableRoomAssignmentProps {
  rooms: Room[]
  participants: Participant[]
  title?: string
}

function PrintableRoomAssignment({
  rooms,
  participants,
  title
}: PrintableRoomAssignmentProps): React.ReactElement {
  const { t } = useTranslation()

  const getRoomParticipants = (roomId: string) => {
    return participants
      .filter((p) => p.roomId === roomId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const handlePrint = () => {
    const printWindow = window.open('about:blank', '_blank')
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.')
      return
    }

    const sortedRooms = [...rooms].sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
    )

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || t('print.roomAssignment')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              font-size: 11px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .header h1 { font-size: 20px; margin-bottom: 5px; }
            .header .date { color: #666; font-size: 12px; }
            .summary {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-bottom: 20px;
              padding: 10px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .summary-item { text-align: center; }
            .summary-item .label { color: #666; font-size: 10px; }
            .summary-item .value { font-size: 16px; font-weight: bold; }
            .rooms-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .room-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
              break-inside: avoid;
            }
            .room-header {
              background: #1877F2;
              color: white;
              padding: 8px 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .room-header h3 { font-size: 14px; margin: 0; }
            .room-header .occupancy {
              font-size: 12px;
              background: rgba(255,255,255,0.2);
              padding: 2px 8px;
              border-radius: 10px;
            }
            .room-meta {
              padding: 6px 12px;
              background: #f8f9fa;
              font-size: 10px;
              color: #666;
              border-bottom: 1px solid #eee;
            }
            .room-meta span { margin-right: 10px; }
            .participant-list { padding: 0; }
            .participant-item {
              padding: 8px 12px;
              border-bottom: 1px solid #eee;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .participant-item:last-child { border-bottom: none; }
            .participant-name { font-weight: 500; }
            .participant-info { color: #666; font-size: 10px; }
            .empty-room {
              padding: 15px;
              text-align: center;
              color: #999;
              font-style: italic;
            }
            @media print {
              body { padding: 10px; }
              .room-card { break-inside: avoid; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title || t('print.roomAssignment')}</h1>
            <div class="date">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('print.totalRooms')}</div>
              <div class="value">${sortedRooms.length}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('print.totalAssigned')}</div>
              <div class="value">${participants.filter((p) => p.roomId).length}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('print.totalCapacity')}</div>
              <div class="value">${sortedRooms.reduce((acc, r) => acc + r.maxCapacity, 0)}</div>
            </div>
          </div>
          <div class="rooms-grid">
            ${sortedRooms
              .map((room) => {
                const roomParticipants = getRoomParticipants(room.id)
                return `
                <div class="room-card">
                  <div class="room-header">
                    <h3>${t('participant.room')} ${room.roomNumber}</h3>
                    <span class="occupancy">${room.currentOccupancy}/${room.maxCapacity}</span>
                  </div>
                  ${
                    room.genderType || room.roomType
                      ? `
                    <div class="room-meta">
                      ${room.genderType ? `<span>${room.genderType === 'male' ? t('room.genderMale') : room.genderType === 'female' ? t('room.genderFemale') : t('room.genderMixed')}</span>` : ''}
                      ${room.roomType && room.roomType !== 'general' ? `<span>${room.roomType === 'guest' ? t('room.typeGuest') : t('room.typeLeadership')}</span>` : ''}
                    </div>
                  `
                      : ''
                  }
                  ${
                    roomParticipants.length > 0
                      ? `
                    <div class="participant-list">
                      ${roomParticipants
                        .map(
                          (p, idx) => `
                        <div class="participant-item">
                          <div>
                            <span class="participant-name">${idx + 1}. ${p.name}</span>
                            ${p.groupName ? `<span class="participant-info"> (${p.groupName})</span>` : ''}
                          </div>
                          <div class="participant-info">
                            ${p.ward || ''}${p.phoneNumber ? ` · ${formatPhoneNumber(p.phoneNumber)}` : ''}
                          </div>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  `
                      : `
                    <div class="empty-room">${t('room.roomEmpty')}</div>
                  `
                  }
                </div>
              `
              })
              .join('')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#DADDE1] text-[#050505] rounded-lg text-sm font-semibold hover:bg-[#F0F2F5] transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      {t('print.roomAssignment')}
    </button>
  )
}

export default PrintableRoomAssignment
