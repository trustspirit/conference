import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { participantsAtom, syncAtom } from '../stores/dataStore'
import { addToastAtom } from '../stores/toastStore'
import { userNameAtom } from '../stores/userStore'
import {
  getBusRouteById,
  updateBusRoute,
  removeParticipantFromBus,
  getAllBusRoutes,
  moveParticipantsToBus,
  markBusAsArrived,
  cancelBusArrival
} from '../services/firebase'
import { writeAuditLog } from '../services/auditLog'
import type { BusRoute, Participant } from '../types'
import { MoveToModal } from '../components'
import { ConfirmDialog } from '../components/ui'
import { BusInfoCard, BusPassengerTable } from '../components/buses'
import { formatPhoneNumber } from '../utils/phoneFormat'

function BusDetailPage(): React.ReactElement {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const participants = useAtomValue(participantsAtom)
  const sync = useSetAtom(syncAtom)
  const addToast = useSetAtom(addToastAtom)
  const userName = useAtomValue(userNameAtom)

  const [bus, setBus] = useState<BusRoute | null>(null)
  const [allBuses, setAllBuses] = useState<BusRoute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showArrivalConfirm, setShowArrivalConfirm] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    region: '',
    departureLocation: '',
    estimatedArrivalTime: '',
    contactName: '',
    contactPhone: '',
    notes: ''
  })

  const loadData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [busData, busesData] = await Promise.all([getBusRouteById(id), getAllBusRoutes()])
      setBus(busData)
      setAllBuses(busesData)
      if (busData) {
        setEditForm({
          name: busData.name,
          region: busData.region,
          departureLocation: busData.departureLocation || '',
          estimatedArrivalTime: busData.estimatedArrivalTime || '',
          contactName: busData.contactName || '',
          contactPhone: formatPhoneNumber(busData.contactPhone || ''),
          notes: busData.notes || ''
        })
      }
    } catch (error) {
      console.error('Failed to load bus:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const busParticipants = participants.filter((p) => p.busId === id)

  const handleSaveEdit = async () => {
    if (!bus || !editForm.name.trim() || !editForm.region.trim()) {
      addToast({ type: 'error', message: t('bus.nameRegionRequired') })
      return
    }

    setIsSaving(true)
    try {
      await updateBusRoute(bus.id, {
        name: editForm.name.trim(),
        region: editForm.region.trim(),
        departureLocation: editForm.departureLocation.trim() || undefined,
        estimatedArrivalTime: editForm.estimatedArrivalTime.trim() || undefined,
        contactName: editForm.contactName.trim() || undefined,
        contactPhone: editForm.contactPhone.trim() || undefined,
        notes: editForm.notes.trim() || undefined
      })

      await writeAuditLog(userName || 'Unknown', 'update', 'bus', bus.id, bus.name)
      addToast({ type: 'success', message: t('bus.busUpdated') })
      setIsEditing(false)
      loadData()
      sync()
    } catch {
      addToast({ type: 'error', message: t('toast.updateFailed') })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveParticipant = async (participant: Participant) => {
    if (!confirm(t('bus.confirmRemoveParticipant', { name: participant.name }))) return

    try {
      await removeParticipantFromBus(participant.id)
      await writeAuditLog(
        userName || 'Unknown',
        'update',
        'participant',
        participant.id,
        participant.name,
        { bus: { from: bus?.name || null, to: null } }
      )
      addToast({ type: 'success', message: t('bus.participantRemoved') })
      loadData()
      sync()
    } catch {
      addToast({ type: 'error', message: t('toast.removeParticipantFailed') })
    }
  }

  const handleSelectParticipant = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((pid) => pid !== participantId)
        : [...prev, participantId]
    )
  }

  const handleSelectAll = () => {
    if (selectedParticipants.length === busParticipants.length) {
      setSelectedParticipants([])
    } else {
      setSelectedParticipants(busParticipants.map((p) => p.id))
    }
  }

  const handleMoveParticipants = async (targetBusId: string) => {
    const targetBus = allBuses.find((b) => b.id === targetBusId)
    if (!targetBus) return

    try {
      await moveParticipantsToBus(selectedParticipants, targetBusId, targetBus.name)
      await writeAuditLog(userName || 'Unknown', 'update', 'bus', targetBusId, targetBus.name, {
        movedParticipants: { from: bus?.name || null, to: targetBus.name }
      })
      addToast({
        type: 'success',
        message: t('bus.movedToBus', { name: targetBus.name, count: selectedParticipants.length })
      })
      setSelectedParticipants([])
      setShowMoveModal(false)
      loadData()
      sync()
    } catch {
      addToast({ type: 'error', message: t('toast.moveParticipantFailed') })
    }
  }

  const handleArrivalToggle = async () => {
    if (!bus || !id) return

    const isCancel = !!bus.arrivedAt

    try {
      if (isCancel) {
        await cancelBusArrival(id)
        addToast({ type: 'success', message: t('bus.arrivalCancelled') })
      } else {
        await markBusAsArrived(id)
        addToast({ type: 'success', message: t('bus.busArrived') })
      }

      await writeAuditLog(userName || 'Unknown', 'update', 'bus', id, bus.name, {
        arrived: { from: isCancel, to: !isCancel }
      })

      loadData()
      sync()
    } catch (error) {
      console.error('Failed to toggle arrival:', error)
      addToast({ type: 'error', message: t('toast.updateFailed') })
    } finally {
      setShowArrivalConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  if (!bus) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h2 className="text-xl font-bold text-[#050505] mb-2">{t('bus.busNotFound')}</h2>
        <Link to="/buses" className="text-[#1877F2] hover:underline font-semibold">
          {t('bus.backToBuses')}
        </Link>
      </div>
    )
  }

  const otherBuses = allBuses.filter((b) => b.id !== bus.id)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] rounded-md font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('common.back')}
        </button>
        <span className="text-[#DADDE1]">|</span>
        <Link
          to="/buses"
          className="inline-flex items-center gap-1.5 text-[#65676B] hover:text-[#1877F2] font-semibold transition-colors"
        >
          {t('bus.backToBuses')}
        </Link>
      </div>

      {/* Bus Info Card */}
      <BusInfoCard
        bus={bus}
        participants={participants}
        isEditing={isEditing}
        isSaving={isSaving}
        editForm={editForm}
        onEditFormChange={setEditForm}
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={() => setIsEditing(false)}
        onSaveEdit={handleSaveEdit}
        onToggleArrival={() => setShowArrivalConfirm(true)}
      />

      {/* Passengers List */}
      <BusPassengerTable
        participants={busParticipants}
        selectedParticipants={selectedParticipants}
        onSelectParticipant={handleSelectParticipant}
        onSelectAll={handleSelectAll}
        onRemoveParticipant={handleRemoveParticipant}
        onMoveSelected={() => setShowMoveModal(true)}
        canMove={otherBuses.length > 0}
      />

      {/* Move Modal */}
      {showMoveModal && (
        <MoveToModal
          type="bus"
          selectedCount={selectedParticipants.length}
          items={otherBuses}
          currentId={id || null}
          isMoving={false}
          error={null}
          onMove={(targetBus) => handleMoveParticipants(targetBus.id)}
          onClose={() => setShowMoveModal(false)}
        />
      )}

      {/* Arrival Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showArrivalConfirm}
        onClose={() => setShowArrivalConfirm(false)}
        onConfirm={handleArrivalToggle}
        title={bus.arrivedAt ? t('bus.cancelArrival') : t('bus.markAsArrived')}
        description={
          bus.arrivedAt
            ? t('bus.confirmCancelArrival')
            : t('bus.confirmMarkArrived', { name: bus.name })
        }
        confirmText={t('common.confirm')}
        variant={bus.arrivedAt ? 'danger' : 'info'}
      />
    </div>
  )
}

export default BusDetailPage
