import React from 'react'
import { useTranslation } from 'react-i18next'
import type {
  UseRoomFilterReturn,
  RoomSortField,
  GenderTypeFilter,
  RoomTypeFilter
} from '../../hooks'

// ============ Types ============

export interface RoomFilterBarProps {
  filter: UseRoomFilterReturn
}

// ============ Component ============

function RoomFilterBar({ filter }: RoomFilterBarProps): React.ReactElement {
  const { t } = useTranslation()
  const {
    filterGenderType,
    setFilterGenderType,
    filterRoomType,
    setFilterRoomType,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
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

        {/* Gender Type Filter */}
        <select
          value={filterGenderType}
          onChange={(e) => setFilterGenderType(e.target.value as GenderTypeFilter)}
          className="px-3 py-1.5 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="all">
            {t('room.genderType')}: {t('common.all')}
          </option>
          <option value="male">{t('room.genderMale')}</option>
          <option value="female">{t('room.genderFemale')}</option>
          <option value="mixed">{t('room.genderMixed')}</option>
        </select>

        {/* Room Type Filter */}
        <select
          value={filterRoomType}
          onChange={(e) => setFilterRoomType(e.target.value as RoomTypeFilter)}
          className="px-3 py-1.5 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="all">
            {t('room.roomType')}: {t('common.all')}
          </option>
          <option value="general">{t('room.typeGeneral')}</option>
          <option value="guest">{t('room.typeGuest')}</option>
          <option value="leadership">{t('room.typeLeadership')}</option>
        </select>

        <span className="text-[#DADDE1]">|</span>

        {/* Sort Label */}
        <span className="text-sm font-semibold text-[#65676B]">{t('common.sort')}:</span>

        {/* Sort Field */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as RoomSortField)}
          className="px-3 py-1.5 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent bg-white"
        >
          <option value="roomNumber">{t('room.roomNumber')}</option>
          <option value="genderType">{t('room.genderType')}</option>
          <option value="roomType">{t('room.roomType')}</option>
          <option value="occupancy">{t('room.occupancy')}</option>
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

export default RoomFilterBar
