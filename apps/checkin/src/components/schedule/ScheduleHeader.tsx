import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  scheduleViewModeAtom,
  scheduleViewOrientationAtom,
  selectedDateAtom,
  customStartDateAtom,
  customEndDateAtom,
  eventPeriodStartAtom,
  eventPeriodEndAtom,
  applyEventPeriodAtom,
  goToPreviousPeriodAtom,
  goToNextPeriodAtom,
  goToTodayAtom
} from '../../stores/scheduleStore'
import {
  formatWeekRange,
  formatDate,
  formatDateForInput,
  parseDateFromInput,
  calculateDaysBetween
} from './scheduleUtils'

interface ScheduleHeaderProps {
  onAddClick: () => void
  onExportPDF: () => void
  onExportViewPDF: () => void
  onExportCSV: () => void
  onExportICS: () => void
  onCopyToClipboard: () => void
  isExporting?: boolean
}

function ScheduleHeader({
  onAddClick,
  onExportPDF,
  onExportViewPDF,
  onExportCSV,
  onExportICS,
  onCopyToClipboard,
  isExporting
}: ScheduleHeaderProps): React.ReactElement {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useAtom(scheduleViewModeAtom)
  const [orientation, setOrientation] = useAtom(scheduleViewOrientationAtom)
  const selectedDate = useAtomValue(selectedDateAtom)
  const [customStartDate, setCustomStartDate] = useAtom(customStartDateAtom)
  const [customEndDate, setCustomEndDate] = useAtom(customEndDateAtom)
  const eventPeriodStart = useAtomValue(eventPeriodStartAtom)
  const eventPeriodEnd = useAtomValue(eventPeriodEndAtom)
  const applyEventPeriod = useSetAtom(applyEventPeriodAtom)
  const goToPrevious = useSetAtom(goToPreviousPeriodAtom)
  const goToNext = useSetAtom(goToNextPeriodAtom)
  const goToToday = useSetAtom(goToTodayAtom)

  const hasEventPeriod = eventPeriodStart && eventPeriodEnd

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false)
      }
      // For date picker, check if date inputs are focused (user is using native calendar)
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        const focusedElement = document.activeElement as HTMLElement
        const isDateInputFocused =
          focusedElement?.tagName === 'INPUT' &&
          focusedElement?.getAttribute('type') === 'date' &&
          datePickerRef.current?.contains(focusedElement)

        if (!isDateInputFocused) {
          setIsDatePickerOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const customDaysCount = calculateDaysBetween(customStartDate, customEndDate)

  // Format custom date range display
  const formatCustomRange = (): string => {
    const startStr = `${customStartDate.getMonth() + 1}/${customStartDate.getDate()}`
    const endStr = `${customEndDate.getMonth() + 1}/${customEndDate.getDate()}`
    return `${startStr} - ${endStr} (${customDaysCount}${t('schedule.days')})`
  }

  const displayTitle =
    viewMode === 'week'
      ? formatWeekRange(selectedDate)
      : viewMode === 'custom'
        ? formatCustomRange()
        : formatDate(selectedDate, 'long')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E4E6EB] p-4 mb-4">
      <div className="flex items-center justify-between">
        {/* Left: Title and Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F2F2] text-[#65676B] transition-colors"
              title={t('schedule.previous')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-[#1877F2] hover:bg-[#E7F3FF] rounded-lg transition-colors"
            >
              {t('schedule.today')}
            </button>
            {hasEventPeriod && (
              <button
                onClick={applyEventPeriod}
                className="px-3 py-1.5 text-sm font-medium text-[#65676B] hover:bg-[#F2F2F2] hover:text-[#1877F2] rounded-lg transition-colors flex items-center gap-1"
                title={`${eventPeriodStart.toLocaleDateString()} - ${eventPeriodEnd.toLocaleDateString()}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {t('schedule.eventPeriod')}
              </button>
            )}
            <button
              onClick={goToNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F2F2] text-[#65676B] transition-colors"
              title={t('schedule.next')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <h2 className="text-lg font-semibold text-[#050505]">{displayTitle}</h2>
        </div>

        {/* Right: View Controls */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle (Week/Day/Custom) */}
          <div className="flex bg-[#F0F2F5] rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-[#1877F2] shadow-sm'
                  : 'text-[#65676B] hover:text-[#050505]'
              }`}
            >
              {t('schedule.weekView')}
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-[#1877F2] shadow-sm'
                  : 'text-[#65676B] hover:text-[#050505]'
              }`}
            >
              {t('schedule.dayView')}
            </button>
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => {
                  if (viewMode === 'custom') {
                    setIsDatePickerOpen(!isDatePickerOpen)
                  } else {
                    setViewMode('custom')
                    setIsDatePickerOpen(true)
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'custom'
                    ? 'bg-white text-[#1877F2] shadow-sm'
                    : 'text-[#65676B] hover:text-[#050505]'
                }`}
              >
                {t('schedule.customView')}
              </button>

              {/* Date Range Picker Dropdown */}
              {isDatePickerOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-[#DADDE1] rounded-xl shadow-xl p-4 z-50 min-w-[280px]">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#65676B] mb-1">
                        {t('schedule.startDate')}
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(customStartDate)}
                        onChange={(e) => {
                          if (!e.target.value) return
                          const newDate = parseDateFromInput(e.target.value)
                          if (isNaN(newDate.getTime())) return
                          setCustomStartDate(newDate)
                        }}
                        onBlur={() => {
                          // Validate: start date should not be after end date
                          if (customStartDate.getTime() > customEndDate.getTime()) {
                            setCustomStartDate(customEndDate)
                          }
                        }}
                        className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#65676B] mb-1">
                        {t('schedule.endDate')}
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(customEndDate)}
                        onChange={(e) => {
                          if (!e.target.value) return
                          const newDate = parseDateFromInput(e.target.value)
                          if (isNaN(newDate.getTime())) return
                          setCustomEndDate(newDate)
                        }}
                        onBlur={() => {
                          // Validate: end date should not be before start date
                          if (customEndDate.getTime() < customStartDate.getTime()) {
                            setCustomEndDate(customStartDate)
                          }
                        }}
                        className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm focus:outline-none focus:border-[#1877F2]"
                      />
                    </div>
                    <div className="pt-2 border-t border-[#E4E6EB]">
                      <p className="text-xs text-[#65676B] text-center">
                        {customDaysCount} {t('schedule.daysSelected')}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDatePickerOpen(false)}
                      className="w-full py-2 bg-[#1877F2] text-white rounded-lg text-sm font-medium hover:bg-[#166FE5] transition-colors"
                    >
                      {t('common.confirm')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Orientation Toggle (Vertical/Horizontal) */}
          <div className="flex bg-[#F0F2F5] rounded-lg p-1">
            <button
              onClick={() => setOrientation('vertical')}
              className={`p-1.5 rounded-md transition-colors ${
                orientation === 'vertical'
                  ? 'bg-white text-[#1877F2] shadow-sm'
                  : 'text-[#65676B] hover:text-[#050505]'
              }`}
              title={t('schedule.verticalView')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <button
              onClick={() => setOrientation('horizontal')}
              className={`p-1.5 rounded-md transition-colors ${
                orientation === 'horizontal'
                  ? 'bg-white text-[#1877F2] shadow-sm'
                  : 'text-[#65676B] hover:text-[#050505]'
              }`}
              title={t('schedule.horizontalView')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10h6m-6 0H3m12 0V7m0 10h6M3 7h18"
                />
              </svg>
            </button>
          </div>

          {/* Export/Share Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 text-[#65676B] hover:bg-[#F2F2F2] rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {isExporting ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              )}
              {t('schedule.export')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isExportMenuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-[#DADDE1] rounded-lg shadow-lg py-1 min-w-[180px] z-50">
                <button
                  onClick={() => {
                    onExportPDF()
                    setIsExportMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  {t('schedule.exportPDF')}
                </button>
                <button
                  onClick={() => {
                    onExportViewPDF()
                    setIsExportMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-[#1877F2]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {t('schedule.exportViewPDF')}
                </button>
                <button
                  onClick={() => {
                    onExportCSV()
                    setIsExportMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t('schedule.exportCSV')}
                </button>
                <button
                  onClick={() => {
                    onExportICS()
                    setIsExportMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {t('schedule.exportICS')}
                </button>
                <div className="border-t border-[#DADDE1] my-1" />
                <button
                  onClick={() => {
                    onCopyToClipboard()
                    setIsExportMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-[#65676B]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  {t('schedule.copyToClipboard')}
                </button>
              </div>
            )}
          </div>

          {/* Add Button */}
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('schedule.addSchedule')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ScheduleHeader
