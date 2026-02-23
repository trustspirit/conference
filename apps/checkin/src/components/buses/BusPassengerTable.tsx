import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Participant } from '../../types'

interface BusPassengerTableProps {
  participants: Participant[]
  selectedParticipants: string[]
  onSelectParticipant: (participantId: string) => void
  onSelectAll: () => void
  onRemoveParticipant: (participant: Participant) => void
  onMoveSelected: () => void
  canMove: boolean
}

function BusPassengerTable({
  participants,
  selectedParticipants,
  onSelectParticipant,
  onSelectAll,
  onRemoveParticipant,
  onMoveSelected,
  canMove
}: BusPassengerTableProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm">
      <div className="px-6 py-4 border-b border-[#DADDE1] flex justify-between items-center">
        <h2 className="text-lg font-bold text-[#050505]">
          {t('bus.passengerList')} ({participants.length})
        </h2>
        {selectedParticipants.length > 0 && canMove && (
          <button
            onClick={onMoveSelected}
            className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5]"
          >
            {t('bus.moveSelected', { count: selectedParticipants.length })}
          </button>
        )}
      </div>

      {participants.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F0F2F5]">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedParticipants.length === participants.length && participants.length > 0
                    }
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-[#DADDE1]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('common.name')}
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('participant.ward')}
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('common.phone')}
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('participant.group')}
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('participant.room')}
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => {
                const isCheckedIn = participant.checkIns.some((ci) => !ci.checkOutTime)
                return (
                  <tr
                    key={participant.id}
                    className="border-b border-[#DADDE1] last:border-b-0 hover:bg-[#F7F8FA]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => onSelectParticipant(participant.id)}
                        className="w-4 h-4 rounded border-[#DADDE1]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/participant/${participant.id}`}
                        className="font-medium text-[#050505] hover:text-[#1877F2]"
                      >
                        {participant.name}
                      </Link>
                      {isCheckedIn && (
                        <span className="ml-2 px-2 py-0.5 bg-[#EFFFF6] text-[#31A24C] rounded text-xs font-semibold">
                          ✓ {t('participant.checkedIn')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#65676B]">{participant.ward || '-'}</td>
                    <td className="px-4 py-3">
                      {participant.phoneNumber ? (
                        <a
                          href={`tel:${participant.phoneNumber}`}
                          className="text-[#1877F2] hover:underline"
                        >
                          {participant.phoneNumber}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {participant.groupName ? (
                        <Link
                          to={`/groups/${participant.groupId}`}
                          className="px-2 py-0.5 bg-[#E7F3FF] text-[#1877F2] rounded text-xs font-semibold hover:bg-[#D4E8FF]"
                        >
                          {participant.groupName}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {participant.roomNumber ? (
                        <Link
                          to={`/rooms/${participant.roomId}`}
                          className="px-2 py-0.5 bg-[#F0F2F5] text-[#65676B] rounded text-xs font-semibold hover:bg-[#E4E6EB]"
                        >
                          {participant.roomNumber}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onRemoveParticipant(participant)}
                        className="text-[#FA383E] hover:underline text-sm font-semibold"
                      >
                        {t('common.remove')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-[#DADDE1] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-[#65676B]">{t('bus.noPassengers')}</p>
          <p className="text-sm text-[#65676B] mt-1">{t('bus.noPassengersDesc')}</p>
        </div>
      )}
    </div>
  )
}

export default BusPassengerTable
