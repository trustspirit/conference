import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Participant, Group, Room } from '../../types'
import {
  exportParticipantsToCSV,
  exportGroupsToCSV,
  exportRoomsToCSV,
  exportCheckInSummaryToCSV
} from '../../services/csvExport'

interface ExportMenuProps {
  show: boolean
  onToggle: () => void
  onClose: () => void
  filteredParticipants: Participant[]
  allParticipants: Participant[]
  groups: Group[]
  rooms: Room[]
}

export function ExportMenu({
  show,
  onToggle,
  onClose,
  filteredParticipants,
  allParticipants,
  groups,
  rooms
}: ExportMenuProps) {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg font-semibold hover:bg-[#E4E6EB] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        {t('common.export')}
        <svg
          className={`w-4 h-4 transition-transform ${show ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#DADDE1] py-2 z-20">
            <div className="px-3 py-1.5 text-xs font-semibold text-[#65676B] uppercase tracking-wide">
              Export Options
            </div>
            <button
              onClick={() => {
                exportParticipantsToCSV(filteredParticipants, {
                  filename: 'participants',
                  includeCheckInHistory: false
                })
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#65676B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Participants (Current View)
            </button>
            <button
              onClick={() => {
                exportParticipantsToCSV(allParticipants, {
                  filename: 'all_participants',
                  includeCheckInHistory: false
                })
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#65676B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              All Participants
            </button>
            <button
              onClick={() => {
                exportParticipantsToCSV(allParticipants, {
                  filename: 'participants_with_history',
                  includeCheckInHistory: true
                })
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#65676B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              With Check-in History
            </button>
            <div className="border-t border-[#DADDE1] my-2" />
            <button
              onClick={() => {
                exportCheckInSummaryToCSV(allParticipants)
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#65676B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Check-in Summary
            </button>
            <button
              onClick={() => {
                exportGroupsToCSV(groups)
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#65676B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Groups
            </button>
            <button
              onClick={() => {
                exportRoomsToCSV(rooms)
                onClose()
              }}
              className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#65676B]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Rooms
            </button>
          </div>
        </>
      )}
    </div>
  )
}
