import React from 'react'
import { useTranslation } from 'react-i18next'
import type { UseGroupFilterReturn, GroupSortField } from '../../hooks'

// ============ Types ============

export interface GroupFilterBarProps {
  filter: UseGroupFilterReturn
}

// ============ Component ============

function GroupFilterBar({ filter }: GroupFilterBarProps): React.ReactElement {
  const { t } = useTranslation()
  const {
    filterTag,
    setFilterTag,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    allTags,
    getTagLabel,
    hasActiveFilters,
    clearFilters,
    filteredCount,
    totalCount
  } = filter

  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Label */}
        <span className="text-sm font-semibold text-[#65676B]">{t('common.filter')}:</span>

        {/* Tag Filter */}
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-3 py-1.5 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="all">{t('group.allTags')}</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {getTagLabel(tag)}
            </option>
          ))}
        </select>

        <span className="text-[#DADDE1]">|</span>

        {/* Sort Label */}
        <span className="text-sm font-semibold text-[#65676B]">{t('common.sort')}:</span>

        {/* Sort Field */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as GroupSortField)}
          className="px-3 py-1.5 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="name">{t('common.name')}</option>
          <option value="participantCount">{t('group.participantCount')}</option>
          <option value="tag">{t('group.tags')}</option>
        </select>

        {/* Sort Direction */}
        <button
          onClick={toggleSortDirection}
          className="px-2 py-1.5 border border-[#DADDE1] rounded-lg text-sm hover:bg-[#F0F2F5] transition-colors"
          title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-[#FA383E] text-sm font-semibold hover:bg-[#FFF5F5] rounded-lg transition-colors"
          >
            {t('common.clear')}
          </button>
        )}

        {/* Count */}
        <span className="ml-auto text-sm text-[#65676B]">
          {filteredCount} / {totalCount}
        </span>
      </div>
    </div>
  )
}

export default GroupFilterBar
