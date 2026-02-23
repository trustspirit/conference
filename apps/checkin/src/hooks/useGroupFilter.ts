import { useState, useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { groupsAtom } from '../stores/dataStore'
import type { Group } from '../types'

// ============ Types ============

export type GroupSortField = 'name' | 'participantCount' | 'tag'
export type SortDirection = 'asc' | 'desc'
export type GroupTagFilter = string // 'all' | specific tag

export interface GroupFilterState {
  filterTag: GroupTagFilter
  sortBy: GroupSortField
  sortDirection: SortDirection
}

export interface GroupFilterActions {
  setFilterTag: (value: GroupTagFilter) => void
  setSortBy: (value: GroupSortField) => void
  toggleSortDirection: () => void
  clearFilters: () => void
}

export interface GroupFilterComputed {
  allTags: string[]
  filteredAndSortedGroups: Group[]
  hasActiveFilters: boolean
  totalCount: number
  filteredCount: number
}

export interface GroupFilterHelpers {
  getTagLabel: (tag: string) => string
  getTagColor: (tag: string) => string
}

export type UseGroupFilterReturn = GroupFilterState &
  GroupFilterActions &
  GroupFilterComputed &
  GroupFilterHelpers

export interface UseGroupFilterOptions {
  /** Optional external data source. If not provided, uses groupsAtom from store */
  data?: Group[]
}

// ============ Hook ============

export function useGroupFilter(options?: UseGroupFilterOptions): UseGroupFilterReturn {
  const { t } = useTranslation()
  const groupsFromAtom = useAtomValue(groupsAtom)

  // Use provided data or fall back to atom data
  const groups = options?.data ?? groupsFromAtom

  // State
  const [filterTag, setFilterTag] = useState<GroupTagFilter>('all')
  const [sortBy, setSortBy] = useState<GroupSortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Computed: All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    groups.forEach((g) => g.tags?.forEach((tag) => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [groups])

  // Computed: Filtered and sorted groups
  const filteredAndSortedGroups = useMemo(() => {
    let result = [...groups]

    if (filterTag !== 'all') {
      result = result.filter((group) => group.tags?.includes(filterTag))
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'participantCount':
          comparison = a.participantCount - b.participantCount
          break
        case 'tag': {
          const aTag = a.tags?.[0] || ''
          const bTag = b.tags?.[0] || ''
          comparison = aTag.localeCompare(bTag)
          break
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [groups, filterTag, sortBy, sortDirection])

  // Computed: Has active filters
  const hasActiveFilters = filterTag !== 'all' || sortBy !== 'name'

  // Actions
  const clearFilters = () => {
    setFilterTag('all')
    setSortBy('name')
    setSortDirection('asc')
  }

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  // Helpers
  const getTagLabel = (tag: string): string => {
    if (tag === 'male') return t('group.tagMale')
    if (tag === 'female') return t('group.tagFemale')
    return tag
  }

  const getTagColor = (tag: string): string => {
    if (tag === 'male') return 'bg-blue-100 text-blue-700'
    if (tag === 'female') return 'bg-pink-100 text-pink-700'
    return 'bg-gray-100 text-gray-600'
  }

  return {
    // State
    filterTag,
    sortBy,
    sortDirection,

    // Actions
    setFilterTag,
    setSortBy,
    toggleSortDirection,
    clearFilters,

    // Computed
    allTags,
    filteredAndSortedGroups,
    hasActiveFilters,
    totalCount: groups.length,
    filteredCount: filteredAndSortedGroups.length,

    // Helpers
    getTagLabel,
    getTagColor
  }
}
