import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { roomsAtom } from '../stores/dataStore'
import type { Room, RoomGenderType, RoomType } from '../types'

// ============ Types ============

export type RoomSortField = 'roomNumber' | 'genderType' | 'roomType' | 'occupancy'
export type SortDirection = 'asc' | 'desc'
export type GenderTypeFilter = RoomGenderType | 'all'
export type RoomTypeFilter = RoomType | 'all'

export interface RoomFilterState {
  filterGenderType: GenderTypeFilter
  filterRoomType: RoomTypeFilter
  sortBy: RoomSortField
  sortDirection: SortDirection
}

export interface RoomFilterActions {
  setFilterGenderType: (value: GenderTypeFilter) => void
  setFilterRoomType: (value: RoomTypeFilter) => void
  setSortBy: (value: RoomSortField) => void
  toggleSortDirection: () => void
  clearFilters: () => void
}

export interface RoomFilterComputed {
  filteredAndSortedRooms: Room[]
  hasActiveFilters: boolean
  totalCount: number
  filteredCount: number
}

export interface RoomFilterHelpers {
  getGenderTypeLabel: (genderType?: RoomGenderType) => string
  getRoomTypeLabel: (roomType?: RoomType) => string
  getGenderTypeBadgeColor: (genderType?: RoomGenderType) => string
  getRoomTypeBadgeColor: (roomType?: RoomType) => string
  getOccupancyBadgeColor: (room: Room) => string
}

export type UseRoomFilterReturn = RoomFilterState &
  RoomFilterActions &
  RoomFilterComputed &
  RoomFilterHelpers

export interface UseRoomFilterOptions {
  /** Optional external data source. If not provided, uses roomsAtom from store */
  data?: Room[]
}

// ============ Hook ============

export function useRoomFilter(options?: UseRoomFilterOptions): UseRoomFilterReturn {
  const { t } = useTranslation()
  const roomsFromAtom = useAtomValue(roomsAtom)

  // Use provided data or fall back to atom data
  const rooms = options?.data ?? roomsFromAtom

  // State
  const [filterGenderType, setFilterGenderType] = useState<GenderTypeFilter>('all')
  const [filterRoomType, setFilterRoomType] = useState<RoomTypeFilter>('all')
  const [sortBy, setSortBy] = useState<RoomSortField>('roomNumber')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Computed: Filtered and sorted rooms
  const filteredAndSortedRooms = useMemo(() => {
    let result = [...rooms]

    if (filterGenderType !== 'all') {
      result = result.filter((room) => room.genderType === filterGenderType)
    }
    if (filterRoomType !== 'all') {
      result = result.filter((room) => room.roomType === filterRoomType)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'roomNumber':
          comparison = a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
          break
        case 'genderType':
          comparison = (a.genderType || '').localeCompare(b.genderType || '')
          break
        case 'roomType':
          comparison = (a.roomType || '').localeCompare(b.roomType || '')
          break
        case 'occupancy':
          comparison = a.currentOccupancy / a.maxCapacity - b.currentOccupancy / b.maxCapacity
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [rooms, filterGenderType, filterRoomType, sortBy, sortDirection])

  // Computed: Has active filters
  const hasActiveFilters =
    filterGenderType !== 'all' || filterRoomType !== 'all' || sortBy !== 'roomNumber'

  // Actions
  const clearFilters = () => {
    setFilterGenderType('all')
    setFilterRoomType('all')
    setSortBy('roomNumber')
    setSortDirection('asc')
  }

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // Helpers
  const getGenderTypeLabel = (genderType?: RoomGenderType): string => {
    switch (genderType) {
      case 'male':
        return t('room.genderMale')
      case 'female':
        return t('room.genderFemale')
      case 'mixed':
        return t('room.genderMixed')
      default:
        return '-'
    }
  }

  const getRoomTypeLabel = (roomType?: RoomType): string => {
    switch (roomType) {
      case 'general':
        return t('room.typeGeneral')
      case 'guest':
        return t('room.typeGuest')
      case 'leadership':
        return t('room.typeLeadership')
      default:
        return '-'
    }
  }

  const getGenderTypeBadgeColor = (genderType?: RoomGenderType): string => {
    switch (genderType) {
      case 'male':
        return 'bg-blue-100 text-blue-700'
      case 'female':
        return 'bg-pink-100 text-pink-700'
      case 'mixed':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-500'
    }
  }

  const getRoomTypeBadgeColor = (roomType?: RoomType): string => {
    switch (roomType) {
      case 'guest':
        return 'bg-amber-100 text-amber-700'
      case 'leadership':
        return 'bg-emerald-100 text-emerald-700'
      default:
        return 'bg-gray-100 text-gray-500'
    }
  }

  const getOccupancyBadgeColor = (room: Room): string => {
    const ratio = room.currentOccupancy / room.maxCapacity
    if (ratio >= 1) return 'bg-[#FFEBEE] text-[#FA383E]'
    if (ratio >= 0.75) return 'bg-[#FFF3E0] text-[#F57C00]'
    return 'bg-[#EFFFF6] text-[#31A24C]'
  }

  return {
    // State
    filterGenderType,
    filterRoomType,
    sortBy,
    sortDirection,

    // Actions
    setFilterGenderType,
    setFilterRoomType,
    setSortBy,
    toggleSortDirection,
    clearFilters,

    // Computed
    filteredAndSortedRooms,
    hasActiveFilters,
    totalCount: rooms.length,
    filteredCount: filteredAndSortedRooms.length,

    // Helpers
    getGenderTypeLabel,
    getRoomTypeLabel,
    getGenderTypeBadgeColor,
    getRoomTypeBadgeColor,
    getOccupancyBadgeColor
  }
}
