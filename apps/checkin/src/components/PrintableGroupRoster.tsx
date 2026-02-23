import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Group, Participant } from '../types'
import { formatPhoneNumber } from '../utils/phoneFormat'

interface PrintableGroupRosterProps {
  groups: Group[]
  participants: Participant[]
  title?: string
}

function PrintableGroupRoster({
  groups,
  participants,
  title
}: PrintableGroupRosterProps): React.ReactElement {
  const { t } = useTranslation()

  const getGroupParticipants = (groupId: string) => {
    return participants
      .filter((p) => p.groupId === groupId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const handlePrint = () => {
    const printWindow = window.open('about:blank', '_blank')
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용해주세요.')
      return
    }

    const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name))

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || t('print.groupRoster')}</title>
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
            .group-section {
              margin-bottom: 25px;
              break-inside: avoid;
            }
            .group-header {
              background: #1877F2;
              color: white;
              padding: 10px 15px;
              border-radius: 8px 8px 0 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .group-header h2 { font-size: 16px; margin: 0; }
            .group-header .count {
              font-size: 12px;
              background: rgba(255,255,255,0.2);
              padding: 3px 10px;
              border-radius: 10px;
            }
            .group-tags {
              background: #f0f2f5;
              padding: 5px 15px;
              font-size: 10px;
              color: #666;
            }
            .group-tags span {
              display: inline-block;
              background: white;
              padding: 2px 8px;
              border-radius: 10px;
              margin-right: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #ddd;
              border-top: none;
            }
            th {
              background: #f8f9fa;
              padding: 8px 10px;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              color: #666;
              border-bottom: 1px solid #ddd;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #eee;
            }
            tr:last-child td { border-bottom: none; }
            .name { font-weight: 500; }
            .contact { color: #666; font-size: 10px; }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 500;
            }
            .badge-paid { background: #d4edda; color: #155724; }
            .badge-unpaid { background: #f8d7da; color: #721c24; }
            .badge-checkedin { background: #cce5ff; color: #004085; }
            .empty-group {
              padding: 20px;
              text-align: center;
              color: #999;
              font-style: italic;
              border: 1px solid #ddd;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            @media print {
              body { padding: 10px; }
              .group-section { break-inside: avoid; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title || t('print.groupRoster')}</h1>
            <div class="date">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('print.totalGroups')}</div>
              <div class="value">${sortedGroups.length}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('print.totalMembers')}</div>
              <div class="value">${participants.filter((p) => p.groupId).length}</div>
            </div>
          </div>
          ${sortedGroups
            .map((group) => {
              const groupParticipants = getGroupParticipants(group.id)
              return `
              <div class="group-section">
                <div class="group-header">
                  <h2>${group.name}</h2>
                  <span class="count">${groupParticipants.length}${group.expectedCapacity ? ` / ${group.expectedCapacity}` : ''} ${t('common.members')}</span>
                </div>
                ${
                  group.tags && group.tags.length > 0
                    ? `
                  <div class="group-tags">
                    ${group.tags.map((tag) => `<span>${tag === 'male' ? t('group.tagMale') : tag === 'female' ? t('group.tagFemale') : tag}</span>`).join('')}
                  </div>
                `
                    : ''
                }
                ${
                  groupParticipants.length > 0
                    ? `
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>${t('common.name')}</th>
                        <th>${t('participant.ward')}</th>
                        <th>${t('participant.room')}</th>
                        <th>${t('common.phone')}</th>
                        <th>${t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${groupParticipants
                        .map((p, idx) => {
                          const isCheckedIn = p.checkIns.some((ci) => !ci.checkOutTime)
                          return `
                          <tr>
                            <td>${idx + 1}</td>
                            <td class="name">${p.name}</td>
                            <td>${p.ward || '-'}</td>
                            <td>${p.roomNumber || '-'}</td>
                            <td class="contact">${p.phoneNumber ? formatPhoneNumber(p.phoneNumber) : '-'}</td>
                            <td>
                              <span class="badge ${p.isPaid ? 'badge-paid' : 'badge-unpaid'}">${p.isPaid ? t('participant.paid') : t('participant.unpaid')}</span>
                              ${isCheckedIn ? `<span class="badge badge-checkedin">${t('participant.checkedIn')}</span>` : ''}
                            </td>
                          </tr>
                        `
                        })
                        .join('')}
                    </tbody>
                  </table>
                `
                    : `
                  <div class="empty-group">${t('group.noMembers')}</div>
                `
                }
              </div>
            `
            })
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
      {t('print.groupRoster')}
    </button>
  )
}

export default PrintableGroupRoster
