import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAtomValue } from 'jotai'
import type { SortField } from '../../types'
import { CheckInFilterButtons, CheckInStatusBadge, getCheckInStatusFromParticipant } from '../'
import { ExportMenu } from './ExportMenu'
import { useParticipantsTabLogic } from '../../hooks'
import { participantsAtom, groupsAtom, roomsAtom } from '../../stores/dataStore'
import { formatPhoneNumber } from '../../utils/phoneFormat'

interface SortableHeaderProps {
  field: SortField
  sortField: SortField | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: SortField) => void
  onResetSort: () => void
  children: React.ReactNode
}

function SortableHeader({
  field,
  sortField,
  sortDirection,
  onSort,
  onResetSort,
  children
}: SortableHeaderProps) {
  const { t } = useTranslation()

  const handleResetSort = (e: React.MouseEvent) => {
    e.stopPropagation()
    onResetSort()
  }

  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide cursor-pointer hover:bg-[#E4E6EB] transition-colors select-none"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <>
            <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
            <button
              onClick={handleResetSort}
              className="ml-1 text-[#65676B] hover:text-[#050505] text-xs font-bold"
              title={t('participant.clearSort')}
            >
              ×
            </button>
          </>
        )}
      </div>
    </th>
  )
}

export function ParticipantsTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const allParticipants = useAtomValue(participantsAtom)
  const groups = useAtomValue(groupsAtom)
  const rooms = useAtomValue(roomsAtom)

  const {
    isPaginationLoading,
    hasMore,
    loadMoreRef,
    participantFilter,
    showExportMenu,
    setShowExportMenu
  } = useParticipantsTabLogic()

  const {
    searchTerm,
    setSearchTerm,
    checkInFilter,
    setCheckInFilter,
    sortField,
    sortDirection,
    handleSort,
    resetSort,
    filteredAndSortedParticipants,
    totalCount,
    checkedInCount,
    notCheckedInCount
  } = participantFilter

  const navigateToParticipant = (participantId: string) => {
    navigate(`/participant/${participantId}`)
  }

  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm">
      <div className="p-4 border-b border-[#DADDE1]">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('participant.filterPlaceholder')}
            className="flex-1 md:max-w-80 px-4 py-2 bg-[#F0F2F5] border-none rounded-full outline-none focus:ring-2 focus:ring-[#1877F2] placeholder-[#65676B]"
          />
          <div className="flex items-center gap-2">
            <CheckInFilterButtons
              filter={checkInFilter}
              onChange={setCheckInFilter}
              counts={{
                all: totalCount,
                checkedIn: checkedInCount,
                notCheckedIn: notCheckedInCount
              }}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E7F3FF] text-[#1877F2] rounded-lg font-semibold hover:bg-[#DBE7F2] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t('common.import')}
            </Link>
            <ExportMenu
              show={showExportMenu}
              onToggle={() => setShowExportMenu(!showExportMenu)}
              onClose={() => setShowExportMenu(false)}
              filteredParticipants={filteredAndSortedParticipants}
              allParticipants={allParticipants}
              groups={groups}
              rooms={rooms}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F0F2F5] border-b border-[#DADDE1]">
              <SortableHeader
                field="name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResetSort={resetSort}
              >
                {t('common.name')}
              </SortableHeader>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                Email
              </th>
              <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                Phone
              </th>
              <SortableHeader
                field="ward"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResetSort={resetSort}
              >
                {t('participant.ward')}
              </SortableHeader>
              <SortableHeader
                field="group"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResetSort={resetSort}
              >
                {t('participant.group')}
              </SortableHeader>
              <SortableHeader
                field="room"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResetSort={resetSort}
              >
                {t('participant.room')}
              </SortableHeader>
              <SortableHeader
                field="payment"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResetSort={resetSort}
              >
                {t('participant.payment')}
              </SortableHeader>
              <SortableHeader
                field="status"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onResetSort={resetSort}
              >
                {t('common.status')}
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedParticipants.map((participant) => (
              <tr
                key={participant.id}
                onClick={() => navigateToParticipant(participant.id)}
                className="border-b border-[#DADDE1] last:border-0 hover:bg-[#F0F2F5] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-semibold text-[#050505]">{participant.name}</td>
                <td className="px-4 py-3 text-[#65676B]">{participant.email}</td>
                <td className="px-4 py-3 text-[#65676B]">
                  {participant.phoneNumber ? formatPhoneNumber(participant.phoneNumber) : '-'}
                </td>
                <td className="px-4 py-3 text-[#65676B]">{participant.ward || '-'}</td>
                <td className="px-4 py-3">
                  {participant.groupName ? (
                    <span className="px-2 py-1 bg-[#E7F3FF] text-[#1877F2] rounded-md text-sm font-semibold">
                      {participant.groupName}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {participant.roomNumber ? (
                    <span className="px-2 py-1 bg-[#F0F2F5] text-[#65676B] rounded-md text-sm font-semibold">
                      {participant.roomNumber}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {participant.isPaid ? (
                    <span className="px-2 py-1 bg-[#EFFFF6] text-[#31A24C] rounded-md text-sm font-semibold">
                      Paid
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-[#FFEBEE] text-[#FA383E] rounded-md text-sm font-semibold">
                      Unpaid
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CheckInStatusBadge
                    status={getCheckInStatusFromParticipant(participant.checkIns)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAndSortedParticipants.length === 0 && !isPaginationLoading && totalCount > 0 && (
          <div className="text-center py-8 text-[#65676B]">
            {t('participant.noParticipantsFound')}
          </div>
        )}
        {filteredAndSortedParticipants.length === 0 && !isPaginationLoading && totalCount === 0 && (
          <div className="text-center py-8 text-[#65676B]">
            {t('participant.noParticipantsYet')}
          </div>
        )}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isPaginationLoading ? (
              <div className="w-6 h-6 border-2 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin" />
            ) : (
              <span className="text-[#65676B] text-sm">{t('participant.scrollToLoadMore')}</span>
            )}
          </div>
        )}
        {!hasMore && filteredAndSortedParticipants.length > 0 && (
          <div className="px-6 py-4 text-center text-sm text-[#65676B]">
            {t('common.allLoaded')}
          </div>
        )}
        {isPaginationLoading && filteredAndSortedParticipants.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#DADDE1] border-t-[#1877F2] rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
