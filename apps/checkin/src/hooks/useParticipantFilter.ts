import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { participantsAtom } from '../stores/dataStore'
import type { Participant, SortField, SortDirection, CheckInFilter } from '../types'

// ============ Types ============

export interface ParticipantFilterState {
  searchTerm: string
  checkInFilter: CheckInFilter
  sortField: SortField | null
  sortDirection: SortDirection
}

export interface ParticipantFilterActions {
  setSearchTerm: (value: string) => void
  setCheckInFilter: (value: CheckInFilter) => void
  setSortField: (value: SortField | null) => void
  setSortDirection: (value: SortDirection) => void
  handleSort: (field: SortField) => void
  resetSort: () => void
  clearFilters: () => void
}

export interface ParticipantFilterComputed {
  filteredAndSortedParticipants: Participant[]
  hasActiveFilters: boolean
  totalCount: number
  filteredCount: number
  checkedInCount: number
  notCheckedInCount: number
}

export type UseParticipantFilterReturn = ParticipantFilterState &
  ParticipantFilterActions &
  ParticipantFilterComputed

export interface UseParticipantFilterOptions {
  /** Optional external data source. If not provided, uses participantsAtom from store */
  data?: Participant[]
}

// ============ Helpers ============

const isCheckedIn = (participant: Participant): boolean => {
  return participant.checkIns.some((ci) => !ci.checkOutTime)
}

// ============ Hook ============

export function useParticipantFilter(
  options?: UseParticipantFilterOptions
): UseParticipantFilterReturn {
  const participantsFromAtom = useAtomValue(participantsAtom)

  // Use provided data or fall back to atom data
  const participants = options?.data ?? participantsFromAtom

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>('all')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Computed: Check-in counts
  const { checkedInCount, notCheckedInCount } = useMemo(() => {
    let checkedIn = 0
    let notCheckedIn = 0
    participants.forEach((p) => {
      if (isCheckedIn(p)) {
        checkedIn++
      } else {
        notCheckedIn++
      }
    })
    return { checkedInCount: checkedIn, notCheckedInCount: notCheckedIn }
  }, [participants])

  // Computed: Filtered and sorted participants
  const filteredAndSortedParticipants = useMemo(() => {
    let result = [...participants]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.email.toLowerCase().includes(searchLower) ||
          p.phoneNumber?.toLowerCase().includes(searchLower) ||
          p.ward?.toLowerCase().includes(searchLower) ||
          p.stake?.toLowerCase().includes(searchLower)
      )
    }

    // Apply check-in status filter
    if (checkInFilter !== 'all') {
      result = result.filter((p) => {
        const checkedIn = isCheckedIn(p)
        return checkInFilter === 'checked-in' ? checkedIn : !checkedIn
      })
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let aValue: string | number = ''
        let bValue: string | number = ''

        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'ward':
            aValue = (a.ward || '').toLowerCase()
            bValue = (b.ward || '').toLowerCase()
            break
          case 'group':
            aValue = (a.groupName || '').toLowerCase()
            bValue = (b.groupName || '').toLowerCase()
            break
          case 'room':
            aValue = a.roomNumber || ''
            bValue = b.roomNumber || ''
            break
          case 'status':
            aValue = isCheckedIn(a) ? 0 : 1
            bValue = isCheckedIn(b) ? 0 : 1
            break
          case 'payment':
            aValue = a.isPaid ? 0 : 1
            bValue = b.isPaid ? 0 : 1
            break
        }

        if (aValue === '' && bValue !== '') return 1
        if (aValue !== '' && bValue === '') return -1
        if (aValue === '' && bValue === '') return 0

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [participants, searchTerm, checkInFilter, sortField, sortDirection])

  // Computed: Has active filters
  const hasActiveFilters = searchTerm !== '' || checkInFilter !== 'all' || sortField !== null

  // Actions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const resetSort = () => {
    setSortField(null)
    setSortDirection('asc')
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCheckInFilter('all')
    setSortField(null)
    setSortDirection('asc')
  }

  return {
    // State
    searchTerm,
    checkInFilter,
    sortField,
    sortDirection,

    // Actions
    setSearchTerm,
    setCheckInFilter,
    setSortField,
    setSortDirection,
    handleSort,
    resetSort,
    clearFilters,

    // Computed
    filteredAndSortedParticipants,
    hasActiveFilters,
    totalCount: participants.length,
    filteredCount: filteredAndSortedParticipants.length,
    checkedInCount,
    notCheckedInCount
  }
}
