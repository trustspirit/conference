import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Participant } from '../types'
// CheckInStatus is available through getCheckInStatusFromParticipant
import CheckInStatusBadge, { getCheckInStatusFromParticipant } from './CheckInStatusBadge'

interface MemberSelectionTableProps {
  members: Participant[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onNavigate: (id: string) => void
  onClearSelection: () => void
  onMoveAction: () => void
  moveActionLabel: string
}

function MemberSelectionTable({
  members,
  selectedIds,
  onToggle,
  onToggleAll,
  onNavigate,
  onClearSelection,
  onMoveAction,
  moveActionLabel
}: MemberSelectionTableProps): React.ReactElement {
  const { t } = useTranslation()
  const allSelected = members.length > 0 && members.every((m) => selectedIds.has(m.id))

  return (
    <div className="ml-6 border-l-2 border-[#1877F2]/30 pl-4">
      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-[#65676B]">
            {selectedIds.size} {t('participant.selected')}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveAction()
            }}
            className="px-3 py-1 bg-[#1877F2] text-white text-sm rounded-md hover:bg-[#166FE5] font-semibold shadow-sm"
          >
            {moveActionLabel}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClearSelection()
            }}
            className="px-3 py-1 bg-[#E4E6EB] text-[#050505] text-sm rounded-md hover:bg-[#D8DADF] font-semibold"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="text-xs text-[#65676B]">
            <th className="py-2 text-left font-medium w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleAll()
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-[#DADDE1] text-[#1877F2] focus:ring-[#1877F2]"
              />
            </th>
            <th className="py-2 text-left font-medium">{t('common.name')}</th>
            <th className="py-2 text-left font-medium">{t('common.email')}</th>
            <th className="py-2 text-left font-medium">{t('common.phone')}</th>
            <th className="py-2 text-left font-medium">{t('common.status')}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className={`hover:bg-[#E7F3FF]/50 cursor-pointer ${
                selectedIds.has(member.id) ? 'bg-[#E7F3FF]/50' : ''
              }`}
            >
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(member.id)}
                  onChange={() => onToggle(member.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-[#DADDE1] text-[#1877F2] focus:ring-[#1877F2]"
                />
              </td>
              <td
                className="py-2 text-sm font-semibold text-[#050505]"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate(member.id)
                }}
              >
                {member.name}
              </td>
              <td className="py-2 text-sm text-[#65676B]">{member.email}</td>
              <td className="py-2 text-sm text-[#65676B]">{member.phoneNumber || '-'}</td>
              <td className="py-2">
                <CheckInStatusBadge status={getCheckInStatusFromParticipant(member.checkIns)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MemberSelectionTable
