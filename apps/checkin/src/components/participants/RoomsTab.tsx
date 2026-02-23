import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { Tooltip, ExpandArrow, MemberSelectionTable, OccupancyBar, MoveToModal } from '../'
import { useRoomsTabLogic } from '../../hooks'
import { roomsAtom, isLoadingAtom } from '../../stores/dataStore'

export function RoomsTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rooms = useAtomValue(roomsAtom)
  const isLoading = useAtomValue(isLoadingAtom)

  const {
    expandedRoomId,
    toggleRoomExpand,
    selectedRoomMembers,
    setSelectedRoomMembers,
    toggleRoomMemberSelection,
    showMoveToRoomModal,
    isMoving,
    moveError,
    handleMoveToRoom,
    openMoveModal,
    closeMoveModal,
    hoveredRoomId,
    setHoveredRoomId,
    getRoomMembers
  } = useRoomsTabLogic()

  const navigateToParticipant = (participantId: string) => {
    navigate(`/participant/${participantId}`)
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm overflow-visible">
        <div className="overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F0F2F5] border-b border-[#DADDE1]">
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B] w-8"></th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Room Number
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Occupancy
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const isFull = room.currentOccupancy >= room.maxCapacity
                const isExpanded = expandedRoomId === room.id
                const members = getRoomMembers(room.id)
                return (
                  <React.Fragment key={room.id}>
                    <tr
                      onClick={() => toggleRoomExpand(room.id)}
                      onMouseEnter={() => setHoveredRoomId(room.id)}
                      onMouseLeave={() => setHoveredRoomId(null)}
                      className="border-b border-[#DADDE1] last:border-0 hover:bg-[#F0F2F5] cursor-pointer transition-colors relative"
                    >
                      <td className="px-4 py-3 text-[#65676B]">
                        <ExpandArrow isExpanded={isExpanded} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#050505] relative">
                        Room {room.roomNumber}
                        {hoveredRoomId === room.id && members.length > 0 && !isExpanded && (
                          <Tooltip
                            title={t('common.occupants')}
                            items={members.map((m) => ({ id: m.id, name: m.name }))}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <OccupancyBar current={room.currentOccupancy} max={room.maxCapacity} />
                      </td>
                      <td className="px-4 py-3">
                        {isFull ? (
                          <span className="px-2 py-1 bg-[#FFEBEE] text-[#FA383E] rounded-md text-xs font-semibold">
                            Full
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-[#EFFFF6] text-[#31A24C] rounded-md text-xs font-semibold">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#65676B]">
                        {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                          room.createdAt
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={5}
                          className="bg-[#F0F2F5] px-4 py-2 border-b border-[#DADDE1]"
                        >
                          {members.length > 0 ? (
                            <MemberSelectionTable
                              members={members}
                              selectedIds={selectedRoomMembers}
                              onToggle={toggleRoomMemberSelection}
                              onToggleAll={() => {
                                if (members.every((m) => selectedRoomMembers.has(m.id))) {
                                  setSelectedRoomMembers(new Set())
                                } else {
                                  setSelectedRoomMembers(new Set(members.map((m) => m.id)))
                                }
                              }}
                              onNavigate={navigateToParticipant}
                              onClearSelection={() => setSelectedRoomMembers(new Set())}
                              onMoveAction={openMoveModal}
                              moveActionLabel="Move to Another Room"
                            />
                          ) : (
                            <div className="ml-6 py-2 text-sm text-[#65676B]">
                              No one assigned to this room
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          {rooms.length === 0 && !isLoading && (
            <div className="text-center py-8 text-[#65676B]">{t('room.noRoomsCreated')}</div>
          )}
        </div>
      </div>

      {showMoveToRoomModal && (
        <MoveToModal
          type="room"
          selectedCount={selectedRoomMembers.size}
          items={rooms}
          currentId={expandedRoomId}
          isMoving={isMoving}
          error={moveError}
          onMove={handleMoveToRoom}
          onClose={closeMoveModal}
        />
      )}
    </>
  )
}
