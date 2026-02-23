import React from 'react'
import { useTranslation } from 'react-i18next'
import type { BusRoute, Participant } from '../types'
import { formatPhoneNumber } from '../utils/phoneFormat'

interface PrintableBusManifestProps {
  buses: BusRoute[]
  participants: Participant[]
  title?: string
  selectedBusId?: string // If provided, only print this bus
}

function PrintableBusManifest({
  buses,
  participants,
  title,
  selectedBusId
}: PrintableBusManifestProps): React.ReactElement {
  const { t } = useTranslation()

  const getBusParticipants = (busId: string) => {
    return participants
      .filter((p) => p.busId === busId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const handlePrint = () => {
    const printWindow = window.open('about:blank', '_blank')
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.')
      return
    }

    const busesToPrint = selectedBusId
      ? buses.filter((b) => b.id === selectedBusId)
      : [...buses].sort((a, b) => {
          const regionCompare = a.region.localeCompare(b.region)
          if (regionCompare !== 0) return regionCompare
          return a.name.localeCompare(b.name)
        })

    const groupedByRegion = busesToPrint.reduce(
      (acc, bus) => {
        if (!acc[bus.region]) {
          acc[bus.region] = []
        }
        acc[bus.region].push(bus)
        return acc
      },
      {} as Record<string, BusRoute[]>
    )

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || t('print.busManifest')}</title>
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
            .header h1 { font-size: 22px; margin-bottom: 5px; }
            .header .date { color: #666; font-size: 12px; }
            .summary {
              display: flex;
              justify-content: center;
              gap: 40px;
              margin-bottom: 25px;
              padding: 12px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .summary-item { text-align: center; }
            .summary-item .label { color: #666; font-size: 10px; text-transform: uppercase; }
            .summary-item .value { font-size: 18px; font-weight: bold; color: #1877F2; }
            .region-section {
              margin-bottom: 30px;
              break-inside: avoid;
            }
            .region-header {
              background: #1877F2;
              color: white;
              padding: 10px 15px;
              border-radius: 8px 8px 0 0;
              font-size: 16px;
              font-weight: bold;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .region-header .icon { font-size: 18px; }
            .bus-card {
              border: 1px solid #ddd;
              border-top: none;
              padding: 15px;
              margin-bottom: 15px;
              break-inside: avoid;
            }
            .bus-card:last-child { border-radius: 0 0 8px 8px; }
            .bus-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .bus-name { font-size: 16px; font-weight: bold; color: #333; }
            .bus-meta { color: #666; font-size: 11px; margin-top: 3px; }
            .bus-count {
              background: #1877F2;
              color: white;
              padding: 4px 12px;
              border-radius: 15px;
              font-size: 12px;
              font-weight: bold;
            }
            .contact-info {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-bottom: 12px;
              padding: 10px;
              background: #f8f9fa;
              border-radius: 6px;
            }
            .contact-item { }
            .contact-label { color: #666; font-size: 9px; text-transform: uppercase; }
            .contact-value { font-weight: 500; color: #333; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th {
              background: #f0f2f5;
              padding: 8px 6px;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
              color: #666;
              border-bottom: 2px solid #ddd;
            }
            td {
              padding: 8px 6px;
              border-bottom: 1px solid #eee;
            }
            tr:last-child td { border-bottom: none; }
            .name-cell { font-weight: 500; }
            .phone-cell { color: #1877F2; }
            .checkbox { width: 20px; height: 20px; border: 1px solid #ccc; border-radius: 3px; }
            .notes {
              margin-top: 10px;
              padding: 8px;
              background: #fff3cd;
              border-radius: 4px;
              font-size: 10px;
              color: #856404;
            }
            .empty-bus {
              text-align: center;
              padding: 20px;
              color: #999;
              font-style: italic;
            }
            @media print {
              body { padding: 10px; }
              .region-section { break-inside: avoid; }
              .bus-card { break-inside: avoid; }
              @page { margin: 8mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title || t('print.busManifest')}</h1>
            <div class="date">${t('print.printedAt')}: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('print.totalRegions')}</div>
              <div class="value">${Object.keys(groupedByRegion).length}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('print.totalBuses')}</div>
              <div class="value">${busesToPrint.length}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('print.totalPassengers')}</div>
              <div class="value">${busesToPrint.reduce((acc, b) => acc + b.participantCount, 0)}</div>
            </div>
          </div>
          ${Object.entries(groupedByRegion)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(
              ([region, regionBuses]) => `
              <div class="region-section">
                <div class="region-header">
                  <span class="icon">📍</span>
                  ${region} (${regionBuses.reduce((acc, b) => acc + b.participantCount, 0)}${t('bus.people')})
                </div>
                ${regionBuses
                  .map((bus) => {
                    const busParticipants = getBusParticipants(bus.id)
                    return `
                      <div class="bus-card">
                        <div class="bus-header">
                          <div>
                            <div class="bus-name">🚌 ${bus.name}</div>
                            ${bus.departureLocation ? `<div class="bus-meta">${t('bus.from')}: ${bus.departureLocation}</div>` : ''}
                          </div>
                          <div class="bus-count">${bus.participantCount}${t('bus.people')}</div>
                        </div>
                        <div class="contact-info">
                          <div class="contact-item">
                            <div class="contact-label">${t('bus.arrivalTime')}</div>
                            <div class="contact-value">${bus.estimatedArrivalTime || '-'}</div>
                          </div>
                          <div class="contact-item">
                            <div class="contact-label">${t('bus.contactName')}</div>
                            <div class="contact-value">${bus.contactName || '-'}</div>
                          </div>
                          <div class="contact-item">
                            <div class="contact-label">${t('bus.contactPhone')}</div>
                            <div class="contact-value">${bus.contactPhone ? formatPhoneNumber(bus.contactPhone) : '-'}</div>
                          </div>
                        </div>
                        ${bus.notes ? `<div class="notes">📝 ${bus.notes}</div>` : ''}
                        ${
                          busParticipants.length > 0
                            ? `
                          <table>
                            <thead>
                              <tr>
                                <th style="width: 30px;">#</th>
                                <th>${t('common.name')}</th>
                                <th>${t('participant.ward')}</th>
                                <th>${t('common.phone')}</th>
                                <th>${t('participant.group')}</th>
                                <th style="width: 50px;">${t('bus.checkedIn')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${busParticipants
                                .map(
                                  (p, idx) => `
                                <tr>
                                  <td>${idx + 1}</td>
                                  <td class="name-cell">${p.name}</td>
                                  <td>${p.ward || '-'}</td>
                                  <td class="phone-cell">${p.phoneNumber ? formatPhoneNumber(p.phoneNumber) : '-'}</td>
                                  <td>${p.groupName || '-'}</td>
                                  <td><div class="checkbox"></div></td>
                                </tr>
                              `
                                )
                                .join('')}
                            </tbody>
                          </table>
                        `
                            : `<div class="empty-bus">${t('bus.noPassengers')}</div>`
                        }
                      </div>
                    `
                  })
                  .join('')}
              </div>
            `
            )
            .join('')}
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
      {selectedBusId ? t('print.printThisBus') : t('print.busManifest')}
    </button>
  )
}

export default PrintableBusManifest
