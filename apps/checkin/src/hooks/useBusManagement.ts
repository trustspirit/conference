import { useState, useCallback, useMemo } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { syncAtom } from '../stores/dataStore'
import { addToastAtom } from '../stores/toastStore'
import { userNameAtom } from '../stores/userStore'
import {
  getAllBusRoutes,
  createOrGetBusRoute,
  deleteBusRoute,
  getAllRegions,
  markBusAsArrived,
  cancelBusArrival
} from '../services/firebase'
import { writeAuditLog } from '../services/auditLog'
import type { BusRoute } from '../types'

interface UseBusManagementReturn {
  buses: BusRoute[]
  regions: string[]
  isLoading: boolean
  loadData: () => Promise<void>
  handleAddBus: (data: CreateBusData) => Promise<boolean>
  handleDeleteBus: (bus: BusRoute) => Promise<boolean>
  handleArrivalToggle: (busId: string, busName: string, isCancel: boolean) => Promise<boolean>
  filteredBuses: BusRoute[]
  busesByTime: BusRoute[]
  groupedByRegion: Record<string, BusRoute[]>
  totalPassengers: number
  arrivedCount: number
  selectedRegion: string
  setSelectedRegion: (region: string) => void
  showArrivedBuses: boolean
  setShowArrivedBuses: (show: boolean) => void
}

interface CreateBusData {
  name: string
  region: string
  departureLocation?: string
  estimatedArrivalTime?: string
  contactName?: string
  contactPhone?: string
  notes?: string
}

export function useBusManagement(): UseBusManagementReturn {
  const { t } = useTranslation()
  const sync = useSetAtom(syncAtom)
  const addToast = useSetAtom(addToastAtom)
  const userName = useAtomValue(userNameAtom)

  const [buses, setBuses] = useState<BusRoute[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [showArrivedBuses, setShowArrivedBuses] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [busData, regionData] = await Promise.all([getAllBusRoutes(), getAllRegions()])
      setBuses(busData)
      setRegions(regionData)
    } catch (error) {
      console.error('Failed to load buses:', error)
      addToast({ type: 'error', message: t('bus.loadFailed') })
    } finally {
      setIsLoading(false)
    }
  }, [addToast, t])

  const handleAddBus = useCallback(
    async (data: CreateBusData): Promise<boolean> => {
      if (!data.name.trim() || !data.region.trim()) {
        addToast({ type: 'error', message: t('bus.nameRegionRequired') })
        return false
      }

      try {
        const bus = await createOrGetBusRoute({
          name: data.name.trim(),
          region: data.region.trim(),
          departureLocation: data.departureLocation?.trim() || undefined,
          estimatedArrivalTime: data.estimatedArrivalTime?.trim() || undefined,
          contactName: data.contactName?.trim() || undefined,
          contactPhone: data.contactPhone?.trim() || undefined,
          notes: data.notes?.trim() || undefined
        })

        await writeAuditLog(userName || 'Unknown', 'create', 'bus', bus.id, bus.name)
        addToast({ type: 'success', message: t('bus.busCreated', { name: bus.name }) })

        loadData()
        sync()
        return true
      } catch (error) {
        console.error('Failed to create bus:', error)
        addToast({ type: 'error', message: t('toast.createFailed') })
        return false
      }
    },
    [addToast, t, userName, loadData, sync]
  )

  const handleDeleteBus = useCallback(
    async (bus: BusRoute): Promise<boolean> => {
      const warningMsg =
        bus.participantCount > 0
          ? t('bus.confirmDeleteWithParticipants', { name: bus.name, count: bus.participantCount })
          : t('bus.confirmDelete', { name: bus.name })

      if (!confirm(warningMsg)) return false

      try {
        await deleteBusRoute(bus.id)
        await writeAuditLog(userName || 'Unknown', 'delete', 'bus', bus.id, bus.name)
        addToast({ type: 'success', message: t('bus.busDeleted', { name: bus.name }) })
        loadData()
        sync()
        return true
      } catch {
        addToast({ type: 'error', message: t('toast.deleteFailed') })
        return false
      }
    },
    [addToast, t, userName, loadData, sync]
  )

  const handleArrivalToggle = useCallback(
    async (busId: string, busName: string, isCancel: boolean): Promise<boolean> => {
      try {
        if (isCancel) {
          await cancelBusArrival(busId)
          addToast({ type: 'success', message: t('bus.arrivalCancelled') })
        } else {
          await markBusAsArrived(busId)
          addToast({ type: 'success', message: t('bus.busArrived') })
        }

        await writeAuditLog(userName || 'Unknown', 'update', 'bus', busId, busName, {
          arrived: { from: isCancel, to: !isCancel }
        })

        loadData()
        sync()
        return true
      } catch (error) {
        console.error('Failed to toggle arrival:', error)
        addToast({ type: 'error', message: t('toast.updateFailed') })
        return false
      }
    },
    [addToast, t, userName, loadData, sync]
  )

  // Parse time string to comparable value
  const parseTime = (timeStr: string | undefined): number => {
    if (!timeStr) return 9999
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Filtered buses
  const filteredBuses = useMemo(() => {
    let result = selectedRegion === 'all' ? buses : buses.filter((b) => b.region === selectedRegion)
    if (!showArrivedBuses) {
      result = result.filter((b) => !b.arrivedAt)
    }
    return result
  }, [buses, selectedRegion, showArrivedBuses])

  // Buses sorted by arrival time for timeline view
  const busesByTime = useMemo(() => {
    return [...filteredBuses].sort((a, b) => {
      const timeA = parseTime(a.estimatedArrivalTime)
      const timeB = parseTime(b.estimatedArrivalTime)
      return timeA - timeB
    })
  }, [filteredBuses])

  // Buses grouped by region
  const groupedByRegion = useMemo(() => {
    return filteredBuses.reduce(
      (acc, bus) => {
        if (!acc[bus.region]) {
          acc[bus.region] = []
        }
        acc[bus.region].push(bus)
        return acc
      },
      {} as Record<string, BusRoute[]>
    )
  }, [filteredBuses])

  // Get total passengers
  const totalPassengers = buses.reduce((acc, bus) => acc + bus.participantCount, 0)
  const arrivedCount = buses.filter((b) => b.arrivedAt).length

  return {
    buses,
    regions,
    isLoading,
    loadData,
    handleAddBus,
    handleDeleteBus,
    handleArrivalToggle,
    filteredBuses,
    busesByTime,
    groupedByRegion,
    totalPassengers,
    arrivedCount,
    selectedRegion,
    setSelectedRegion,
    showArrivedBuses,
    setShowArrivedBuses
  }
}
