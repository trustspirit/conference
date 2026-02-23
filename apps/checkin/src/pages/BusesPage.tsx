import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { participantsAtom } from '../stores/dataStore'
import type { BusRoute } from '../types'
import PrintableBusManifest from '../components/PrintableBusManifest'
import { ConfirmDialog } from '../components/ui'
import {
  AddBusForm,
  BusFilterBar,
  BusRegionCard,
  BusSummaryCards,
  BusTimelineItem
} from '../components/buses'
import { useBusManagement } from '../hooks/useBusManagement'

type ViewMode = 'timeline' | 'region'

function BusesPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const participants = useAtomValue(participantsAtom)

  const {
    buses,
    regions,
    isLoading,
    loadData,
    handleAddBus,
    handleDeleteBus,
    handleArrivalToggle,
    busesByTime,
    groupedByRegion,
    totalPassengers,
    arrivedCount,
    selectedRegion,
    setSelectedRegion,
    showArrivedBuses,
    setShowArrivedBuses
  } = useBusManagement()

  const [isAdding, setIsAdding] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [arrivalConfirm, setArrivalConfirm] = useState<{
    open: boolean
    busId: string
    busName: string
    isCancel: boolean
  }>({ open: false, busId: '', busName: '', isCancel: false })

  // Form state
  const [newBusName, setNewBusName] = useState('')
  const [newRegion, setNewRegion] = useState('')
  const [newDepartureLocation, setNewDepartureLocation] = useState('')
  const [newArrivalTime, setNewArrivalTime] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [loadData])

  const onAddBusSubmit = async () => {
    const success = await handleAddBus({
      name: newBusName,
      region: newRegion,
      departureLocation: newDepartureLocation,
      estimatedArrivalTime: newArrivalTime,
      contactName: newContactName,
      contactPhone: newContactPhone,
      notes: newNotes
    })

    if (success) {
      resetForm()
      setIsAdding(false)
    }
  }

  const resetForm = () => {
    setNewBusName('')
    setNewRegion('')
    setNewDepartureLocation('')
    setNewArrivalTime('')
    setNewContactName('')
    setNewContactPhone('')
    setNewNotes('')
  }

  const onArrivalConfirm = async () => {
    const { busId, busName, isCancel } = arrivalConfirm
    await handleArrivalToggle(busId, busName, isCancel)
    setArrivalConfirm({ open: false, busId: '', busName: '', isCancel: false })
  }

  const handleMarkArrival = (bus: BusRoute) => {
    setArrivalConfirm({
      open: true,
      busId: bus.id,
      busName: bus.name,
      isCancel: !!bus.arrivedAt
    })
  }

  // Format time for display
  const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr) return '-'
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? '오후' : '오전'
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${ampm} ${displayHour}:${minutes}`
  }

  // Get filtered buses count based on current view mode
  const filteredBuses =
    viewMode === 'timeline' ? busesByTime : Object.values(groupedByRegion).flat()

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#050505]">{t('bus.title')}</h1>
          <p className="text-[#65676B] mt-1">{t('bus.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <PrintableBusManifest buses={buses} participants={participants} />
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] transition-colors"
          >
            {t('bus.addBus')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && buses.length > 0 && (
        <BusSummaryCards
          totalBuses={buses.length}
          totalPassengers={totalPassengers}
          totalRegions={regions.length}
          arrivedCount={arrivedCount}
        />
      )}

      {/* Add Bus Form */}
      {isAdding && (
        <AddBusForm
          newBusName={newBusName}
          onBusNameChange={setNewBusName}
          newRegion={newRegion}
          onRegionChange={setNewRegion}
          newDepartureLocation={newDepartureLocation}
          onDepartureLocationChange={setNewDepartureLocation}
          newArrivalTime={newArrivalTime}
          onArrivalTimeChange={setNewArrivalTime}
          newContactName={newContactName}
          onContactNameChange={setNewContactName}
          newContactPhone={newContactPhone}
          onContactPhoneChange={setNewContactPhone}
          newNotes={newNotes}
          onNotesChange={setNewNotes}
          regions={regions}
          onSubmit={onAddBusSubmit}
          onCancel={() => {
            setIsAdding(false)
            resetForm()
          }}
        />
      )}

      {/* View Toggle & Region Filter */}
      <BusFilterBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        regions={regions}
        buses={buses}
        showArrivedBuses={showArrivedBuses}
        onShowArrivedBusesChange={setShowArrivedBuses}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('common.loading')}</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && buses.length === 0 && (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-[#DADDE1] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <div className="text-[#65676B] text-lg">{t('bus.noBuses')}</div>
          <p className="text-[#65676B] mt-2 text-sm">{t('bus.noBusesDesc')}</p>
        </div>
      )}

      {/* Timeline View - Sorted by Arrival Time */}
      {!isLoading && filteredBuses.length > 0 && viewMode === 'timeline' && (
        <div className="bg-white rounded-xl border border-[#DADDE1] overflow-hidden">
          {/* Timeline Header */}
          <div className="bg-gradient-to-r from-[#1877F2] to-[#42A5F5] px-6 py-4 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('bus.arrivalSchedule')}
            </h2>
            <p className="text-white/80 text-sm mt-1">{t('bus.sortedByArrival')}</p>
          </div>

          {/* Timeline List */}
          <div className="divide-y divide-[#DADDE1]">
            {busesByTime.map((bus) => (
              <BusTimelineItem
                key={bus.id}
                bus={bus}
                participants={participants}
                onNavigate={(busId) => navigate(`/buses/${busId}`)}
                onMarkArrival={handleMarkArrival}
                onDelete={handleDeleteBus}
                formatTime={formatTime}
              />
            ))}
          </div>
        </div>
      )}

      {/* Region View - Grouped by Region */}
      {!isLoading && filteredBuses.length > 0 && viewMode === 'region' && (
        <div className="space-y-6">
          {Object.entries(groupedByRegion)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([region, regionBuses]) => (
              <div key={region}>
                <h2 className="text-lg font-bold text-[#050505] mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-[#1877F2]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {region}
                  <span className="text-sm font-normal text-[#65676B]">
                    ({regionBuses.length}
                    {t('bus.busCount')})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regionBuses.map((bus) => (
                    <BusRegionCard
                      key={bus.id}
                      bus={bus}
                      participants={participants}
                      onNavigate={(busId) => navigate(`/buses/${busId}`)}
                      onMarkArrival={handleMarkArrival}
                      onDelete={handleDeleteBus}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Arrival Confirmation Dialog */}
      <ConfirmDialog
        isOpen={arrivalConfirm.open}
        onClose={() => setArrivalConfirm({ open: false, busId: '', busName: '', isCancel: false })}
        onConfirm={onArrivalConfirm}
        title={arrivalConfirm.isCancel ? t('bus.cancelArrival') : t('bus.markAsArrived')}
        description={
          arrivalConfirm.isCancel
            ? t('bus.confirmCancelArrival')
            : t('bus.confirmMarkArrived', { name: arrivalConfirm.busName })
        }
        confirmText={t('common.confirm')}
        variant={arrivalConfirm.isCancel ? 'danger' : 'info'}
      />
    </div>
  )
}

export default BusesPage
