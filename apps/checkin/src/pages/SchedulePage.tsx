import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  schedulesAtom,
  isLoadingSchedulesAtom,
  scheduleViewModeAtom,
  scheduleViewOrientationAtom,
  selectedDateAtom,
  setupScheduleListenerAtom,
  cleanupScheduleListenerAtom
} from '../stores/scheduleStore'
import { addToastAtom } from '../stores/toastStore'
import {
  ScheduleHeader,
  ScheduleWeekView,
  ScheduleDayView,
  ScheduleTimelineView,
  AddScheduleModal
} from '../components/schedule'
import PrintableSchedule from '../components/schedule/PrintableSchedule'
import type { ScheduleEvent } from '../types'
import { Spinner } from '../components/ui'
import { useExportPDF, useExportFullPDF } from '../hooks'
import {
  exportScheduleToCSV,
  exportScheduleToICS,
  copyScheduleToClipboard
} from '../services/scheduleExport'

function SchedulePage(): React.ReactElement {
  const { t } = useTranslation()
  const schedules = useAtomValue(schedulesAtom)
  const isLoading = useAtomValue(isLoadingSchedulesAtom)
  const viewMode = useAtomValue(scheduleViewModeAtom)
  const orientation = useAtomValue(scheduleViewOrientationAtom)
  const selectedDate = useAtomValue(selectedDateAtom)
  const setupListener = useSetAtom(setupScheduleListenerAtom)
  const cleanupListener = useSetAtom(cleanupScheduleListenerAtom)
  const addToast = useSetAtom(addToastAtom)

  // Refs for PDF export
  const printableRef = useRef<HTMLDivElement>(null)
  const scheduleViewRef = useRef<HTMLDivElement>(null)

  // PDF export hooks
  const { isExporting: isExportingPrintable, exportPDF: exportPrintablePDF } = useExportPDF(
    printableRef,
    {
      filename: 'schedule',
      backgroundColor: '#FFFFFF'
    }
  )
  const { isExporting: isExportingView, exportFullPDF: exportViewPDF } = useExportFullPDF(
    scheduleViewRef,
    {
      filename: 'schedule_full',
      backgroundColor: '#FFFFFF',
      orientation: 'landscape'
    }
  )

  const isExporting = isExportingPrintable || isExportingView

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<ScheduleEvent | null>(null)
  const [initialModalData, setInitialModalData] = useState<{
    date?: Date
    startTime?: string
    endTime?: string
  }>({})

  // Setup realtime listener on mount
  useEffect(() => {
    setupListener()
    return () => cleanupListener()
  }, [setupListener, cleanupListener])

  const handleAddClick = useCallback(() => {
    setEditEvent(null)
    setInitialModalData({})
    setIsAddModalOpen(true)
  }, [])

  const handleEventClick = useCallback((event: ScheduleEvent) => {
    setEditEvent(event)
    setInitialModalData({})
    setIsAddModalOpen(true)
  }, [])

  const handleOpenAddModal = useCallback((date: Date, startTime: string, endTime: string) => {
    setEditEvent(null)
    setInitialModalData({ date, startTime, endTime })
    setIsAddModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false)
    setEditEvent(null)
    setInitialModalData({})
  }, [])

  // Export handlers
  const handleExportCSV = useCallback(() => {
    exportScheduleToCSV(schedules, 'schedule')
    addToast({ type: 'success', message: t('schedule.exportSuccess') })
  }, [schedules, addToast, t])

  const handleExportICS = useCallback(() => {
    exportScheduleToICS(schedules, 'schedule')
    addToast({ type: 'success', message: t('schedule.exportSuccess') })
  }, [schedules, addToast, t])

  const handleCopyToClipboard = useCallback(async () => {
    const success = await copyScheduleToClipboard(schedules, selectedDate, viewMode)
    if (success) {
      addToast({ type: 'success', message: t('schedule.copiedToClipboard') })
    } else {
      addToast({ type: 'error', message: t('schedule.copyFailed') })
    }
  }, [schedules, selectedDate, viewMode, addToast, t])

  // Determine which view to render
  const renderView = () => {
    if (orientation === 'horizontal') {
      return (
        <ScheduleTimelineView onEventClick={handleEventClick} onOpenAddModal={handleOpenAddModal} />
      )
    }

    if (viewMode === 'day') {
      return <ScheduleDayView onEventClick={handleEventClick} onOpenAddModal={handleOpenAddModal} />
    }

    // 'week' and 'custom' modes both use ScheduleWeekView
    return <ScheduleWeekView onEventClick={handleEventClick} onOpenAddModal={handleOpenAddModal} />
  }

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#050505]">{t('schedule.title')}</h1>
        <p className="text-[#65676B] mt-1">{t('schedule.subtitle')}</p>
      </div>

      {/* Header with controls */}
      <ScheduleHeader
        onAddClick={handleAddClick}
        onExportPDF={exportPrintablePDF}
        onExportViewPDF={exportViewPDF}
        onExportCSV={handleExportCSV}
        onExportICS={handleExportICS}
        onCopyToClipboard={handleCopyToClipboard}
        isExporting={isExporting}
      />

      {/* Schedule View */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#E4E6EB] p-12 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div ref={scheduleViewRef}>{renderView()}</div>
      )}

      {/* Summary Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E4E6EB] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-[#65676B]">{t('schedule.totalEvents')}: </span>
              <span className="font-semibold text-[#050505]">{schedules.length}</span>
            </div>
          </div>
          <div className="text-xs text-[#65676B]">{t('schedule.dragHint')}</div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddScheduleModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        editEvent={editEvent}
        initialDate={initialModalData.date}
        initialStartTime={initialModalData.startTime}
        initialEndTime={initialModalData.endTime}
      />

      {/* Hidden printable component for PDF export */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <PrintableSchedule
          ref={printableRef}
          schedules={schedules}
          selectedDate={selectedDate}
          viewMode={viewMode}
        />
      </div>
    </div>
  )
}

export default SchedulePage
