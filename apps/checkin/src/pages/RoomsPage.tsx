import React, { useState, useEffect, useRef } from 'react'
import { useToast } from 'trust-ui-react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { participantsAtom, syncAtom } from '../stores/dataStore'
import {
  createOrGetRoom,
  deleteRoom,
  getRoomsPaginated,
  subscribeToRooms,
  updateRoom
} from '../services/firebase'
import { readFileAsText } from '../utils/fileReader'
import { useRoomFilter, useBatchedInfiniteScrollWithRealtime } from '../hooks'
import type { Room, RoomGenderType, RoomType } from '../types'
import { ViewMode } from '../types'
import {
  ViewModeToggle,
  StatusDot,
  getRoomStatus,
  ImportCSVPanel,
  RoomFilterBar,
  AddRoomForm,
  PrintableRoomAssignment,
  RoomHoverContent
} from '../components'
import { HoverCard, ConfirmDialog } from '../components/ui'

function RoomsPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const participants = useAtomValue(participantsAtom)
  const sync = useSetAtom(syncAtom)
  const { toast } = useToast()

  // Batched infinite scroll pagination with realtime sync
  const {
    displayedItems: paginatedRooms,
    isLoading,
    hasMore,
    loadMore,
    refresh
  } = useBatchedInfiniteScrollWithRealtime<Room>({
    fetchBatchSize: 1000,
    displayBatchSize: 100,
    fetchFunction: getRoomsPaginated,
    getItemId: (room) => room.id,
    subscribeFunction: subscribeToRooms
  })

  // Use the filter hook with paginated data
  const roomFilter = useRoomFilter({ data: paginatedRooms })
  const {
    filteredAndSortedRooms,
    totalCount,
    clearFilters,
    getGenderTypeLabel,
    getRoomTypeLabel,
    getGenderTypeBadgeColor,
    getRoomTypeBadgeColor,
    getOccupancyBadgeColor
  } = roomFilter

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    room: Room | null
  }>({ open: false, room: null })

  // Local UI state
  const [isAdding, setIsAdding] = useState(false)
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState(4)
  const [newGenderType, setNewGenderType] = useState<RoomGenderType | ''>('')
  const [newRoomType, setNewRoomType] = useState<RoomType | ''>('')
  const [isImporting, setIsImporting] = useState(false)
  const [csvInput, setCsvInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.List)

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoading, loadMore])

  const handleAddRoom = async () => {
    if (!newRoomNumber.trim()) return
    try {
      const room = await createOrGetRoom({
        roomNumber: newRoomNumber.trim(),
        maxCapacity: newRoomCapacity,
        genderType: newGenderType || undefined,
        roomType: newRoomType || undefined
      })
      toast({ variant: 'success', message: t('room.roomCreated', { number: room.roomNumber }) })
      setNewRoomNumber('')
      setNewRoomCapacity(4)
      setNewGenderType('')
      setNewRoomType('')
      setIsAdding(false)
      refresh()
      sync()
    } catch {
      toast({ variant: 'danger', message: t('toast.createFailed') })
    }
  }

  const handleDeleteRoom = (room: Room) => {
    setDeleteConfirm({ open: true, room })
  }

  const confirmDeleteRoom = async () => {
    if (!deleteConfirm.room) return
    try {
      await deleteRoom(deleteConfirm.room.id)
      toast({ variant: 'success', message: t('room.roomDeleted', { number: deleteConfirm.room.roomNumber }) })
      refresh()
      sync()
    } catch {
      toast({ variant: 'danger', message: t('toast.deleteFailed') })
    }
  }

  const parseGenderType = (value: string): RoomGenderType | undefined => {
    const normalized = value.toLowerCase().trim()
    if (['male', 'm', '남', '남성'].includes(normalized)) return 'male'
    if (['female', 'f', '여', '여성'].includes(normalized)) return 'female'
    if (['mixed', 'mx', '혼성'].includes(normalized)) return 'mixed'
    return undefined
  }

  const parseRoomType = (value: string): RoomType | undefined => {
    const normalized = value.toLowerCase().trim()
    if (['general', 'g', '일반'].includes(normalized)) return 'general'
    if (['guest', '게스트'].includes(normalized)) return 'guest'
    if (['leadership', 'leader', 'l', '리더십', '리더'].includes(normalized)) return 'leadership'
    return undefined
  }

  const handleImportCSV = async () => {
    if (!csvInput.trim()) return
    const lines = csvInput
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    let created = 0

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim())
      const roomNumber = parts[0]
      const capacity = parseInt(parts[1]) || 4
      const genderType = parts[2] ? parseGenderType(parts[2]) : undefined
      const roomType = parts[3] ? parseRoomType(parts[3]) : undefined
      if (!roomNumber) continue
      try {
        const room = await createOrGetRoom({
          roomNumber,
          maxCapacity: capacity,
          genderType,
          roomType
        })
        created++
      } catch {
        console.error(`Failed to create room: ${roomNumber}`)
      }
    }

    toast({ variant: 'success', message: t('room.importedCount', { count: created }) })
    setCsvInput('')
    setIsImporting(false)
    refresh()
    sync()
  }

  const handleFileImport = async () => {
    const content = await readFileAsText('.csv')
    if (!content) return

    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const hasHeader =
      lines[0]?.toLowerCase().includes('room') || lines[0]?.toLowerCase().includes('capacity')
    const dataLines = hasHeader ? lines.slice(1) : lines
    let created = 0

    for (const line of dataLines) {
      const parts = line.split(',').map((p) => p.trim())
      const roomNumber = parts[0]
      const capacity = parseInt(parts[1]) || 4
      const genderType = parts[2] ? parseGenderType(parts[2]) : undefined
      const roomType = parts[3] ? parseRoomType(parts[3]) : undefined
      if (!roomNumber) continue
      try {
        const room = await createOrGetRoom({
          roomNumber,
          maxCapacity: capacity,
          genderType,
          roomType
        })
        created++
      } catch {
        console.error(`Failed to create room: ${roomNumber}`)
      }
    }

    toast({ variant: 'success', message: t('room.importedFromCSV', { count: created }) })
    refresh()
    sync()
  }

  const getRoomParticipants = (roomId: string) => {
    return participants.filter((p) => p.roomId === roomId)
  }

  const handleSetRoomLeader = async (
    room: Room,
    participantId: string | null,
    participantName: string | null
  ) => {
    try {
      await updateRoom(room.id, {
        leaderId: participantId,
        leaderName: participantName
      })
      toast({
        variant: 'success',
        message: participantId ? t('room.leaderSet') : t('room.leaderRemoved')
      })
      refresh()
      sync()
    } catch (error) {
      console.error('Failed to set room leader:', error)
      toast({ variant: 'danger', message: t('toast.updateFailed') })
    }
  }

  const renderRoomHoverContent = (room: Room) => {
    const roomParticipants = getRoomParticipants(room.id)
    return (
      <RoomHoverContent
        room={room}
        participants={roomParticipants}
        onSetLeader={handleSetRoomLeader}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#050505]">{t('room.title')}</h1>
          <p className="text-[#65676B] mt-1">{t('room.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <PrintableRoomAssignment rooms={paginatedRooms} participants={participants} />
          <button
            onClick={() => setIsImporting(!isImporting)}
            className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-lg text-sm font-semibold hover:bg-[#F0F2F5] transition-colors"
          >
            {t('nav.importCSV')}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] transition-colors"
          >
            {t('room.addRoom')}
          </button>
        </div>
      </div>

      {/* Import CSV Panel */}
      {isImporting && (
        <ImportCSVPanel
          title={t('room.importRooms')}
          placeholder={t('room.importPlaceholder')}
          helpText={t('room.importHelpTextExtended')}
          csvInput={csvInput}
          onCsvInputChange={setCsvInput}
          onFileSelect={handleFileImport}
          onImport={handleImportCSV}
          onCancel={() => {
            setIsImporting(false)
            setCsvInput('')
          }}
        />
      )}

      {/* Add Room Form */}
      {isAdding && (
        <AddRoomForm
          newRoomNumber={newRoomNumber}
          onRoomNumberChange={setNewRoomNumber}
          newRoomCapacity={newRoomCapacity}
          onRoomCapacityChange={setNewRoomCapacity}
          newGenderType={newGenderType}
          onGenderTypeChange={setNewGenderType}
          newRoomType={newRoomType}
          onRoomTypeChange={setNewRoomType}
          onSubmit={handleAddRoom}
          onCancel={() => {
            setIsAdding(false)
            setNewRoomNumber('')
            setNewRoomCapacity(4)
            setNewGenderType('')
            setNewRoomType('')
          }}
        />
      )}

      {/* Filter and Sort Controls */}
      {totalCount > 0 && <RoomFilterBar filter={roomFilter} />}

      {/* Loading State */}
      {isLoading && totalCount === 0 && (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('common.loading')}</div>
        </div>
      )}

      {/* Content */}
      {!isLoading && totalCount === 0 ? (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('room.noRooms')}</div>
          <p className="text-[#65676B] mt-2 text-sm">{t('room.noRoomsDesc')}</p>
        </div>
      ) : filteredAndSortedRooms.length === 0 && totalCount > 0 ? (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('room.noRoomsFiltered')}</div>
          <button
            onClick={clearFilters}
            className="mt-2 text-[#1877F2] hover:underline font-semibold"
          >
            {t('common.clearFilters')}
          </button>
        </div>
      ) : viewMode === ViewMode.List ? (
        /* List View */
        <div className="bg-white rounded-lg border border-[#DADDE1] overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F0F2F5] border-b border-[#DADDE1] rounded-t-lg">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold rounded-tl-lg">
                  {t('participant.room')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('room.genderType')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('room.roomType')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('room.occupancy')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('common.status')}
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold rounded-tr-lg">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRooms.map((room) => {
                return (
                  <HoverCard key={room.id} content={renderRoomHoverContent(room)}>
                    <tr
                      className="border-b border-[#DADDE1] last:border-b-0 hover:bg-[#F7F8FA] cursor-pointer relative"
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-[#050505]">
                        <div className="flex items-center gap-2">
                          {t('participant.room')} {room.roomNumber}
                          {room.leaderId && <span className="text-amber-500">👑</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {room.genderType && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getGenderTypeBadgeColor(room.genderType)}`}
                          >
                            {getGenderTypeLabel(room.genderType)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {room.roomType && room.roomType !== 'general' && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getRoomTypeBadgeColor(room.roomType)}`}
                          >
                            {getRoomTypeLabel(room.roomType)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#65676B]">
                        {room.currentOccupancy} / {room.maxCapacity}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getOccupancyBadgeColor(room)}`}
                        >
                          {room.currentOccupancy >= room.maxCapacity
                            ? t('room.full')
                            : t('room.available')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRoom(room)
                          }}
                          className="text-[#FA383E] hover:underline text-sm font-semibold"
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  </HoverCard>
                )
              })}
            </tbody>
          </table>

          {/* Load More Indicator */}
          {hasMore && (
            <div ref={loadMoreRef} className="px-6 py-4 text-center text-sm text-[#65676B]">
              {isLoading ? t('common.loading') : t('common.scrollForMore')}
            </div>
          )}

          {!hasMore && filteredAndSortedRooms.length > 0 && (
            <div className="px-6 py-4 text-center text-sm text-[#65676B]">
              {t('common.allLoaded')}
            </div>
          )}
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedRooms.map((room) => {
            const status = getRoomStatus(room.currentOccupancy, room.maxCapacity)
            return (
              <HoverCard key={room.id} content={renderRoomHoverContent(room)}>
                <div
                  className="relative bg-white rounded-lg border border-[#DADDE1] p-4 hover:shadow-md hover:border-[#1877F2] transition-all cursor-pointer"
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#050505] text-lg">
                          {t('participant.room')} {room.roomNumber}
                        </h3>
                        {room.leaderId && <span className="text-amber-500">👑</span>}
                      </div>
                      <p className="text-sm text-[#65676B]">
                        {room.currentOccupancy} / {room.maxCapacity} {t('room.occupied')}
                      </p>
                    </div>
                    <StatusDot status={status} />
                  </div>

                  {room.leaderName && (
                    <div className="flex items-center gap-1 mb-2 text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      <span>👑</span>
                      <span className="font-medium">{room.leaderName}</span>
                    </div>
                  )}

                  {(room.genderType || (room.roomType && room.roomType !== 'general')) && (
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {room.genderType && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getGenderTypeBadgeColor(room.genderType)}`}
                        >
                          {getGenderTypeLabel(room.genderType)}
                        </span>
                      )}
                      {room.roomType && room.roomType !== 'general' && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getRoomTypeBadgeColor(room.roomType)}`}
                        >
                          {getRoomTypeLabel(room.roomType)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getOccupancyBadgeColor(room)}`}
                    >
                      {room.currentOccupancy >= room.maxCapacity
                        ? t('room.full')
                        : t('room.available')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRoom(room)
                      }}
                      className="text-[#FA383E] hover:underline text-xs font-semibold"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </HoverCard>
            )
          })}

          {/* Load More Card */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center p-8">
              <div className="text-sm text-[#65676B]">
                {isLoading ? t('common.loading') : t('common.scrollForMore')}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, room: null })}
        onConfirm={confirmDeleteRoom}
        title={t('common.delete')}
        description={
          deleteConfirm.room
            ? deleteConfirm.room.currentOccupancy > 0
              ? t('room.confirmDeleteWithParticipants', {
                  number: deleteConfirm.room.roomNumber,
                  count: deleteConfirm.room.currentOccupancy
                })
              : t('room.confirmDelete', { number: deleteConfirm.room.roomNumber })
            : ''
        }
        variant="danger"
      />
    </div>
  )
}

export default RoomsPage
