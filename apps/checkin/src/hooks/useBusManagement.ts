import { useState, useCallback, useMemo, useEffect } from 'react'
import { useToast } from 'trust-ui-react'
import { useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { syncAtom } from '../stores/dataStore'
import {
  createOrGetBusRoute,
  deleteBusRoute,
  getAllRegions,
  markBusAsArrived,
  cancelBusArrival,
  getBusesPaginated,
  subscribeToBuses
} from '../services/firebase'
import { useBatchedInfiniteScrollWithRealtime } from './useBatchedInfiniteScrollWithRealtime'
import type { BusRoute } from '../types'

interface UseBusManagementReturn {
  buses: BusRoute[]
  regions: string[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
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
  const { toast } = useToast()

  const { displayedItems: buses, isLoading, hasMore, loadMore, refresh } =
    useBatchedInfiniteScrollWithRealtime<BusRoute>({
      fetchBatchSize: 1000,
      displayBatchSize: 100,
      fetchFunction: getBusesPaginated,
      getItemId: (bus) => bus.id,
      subscribeFunction: (callback) => subscribeToBuses(callback)
    })

  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [showArrivedBuses, setShowArrivedBuses] = useState(true)

  // Load regions separately (lightweight call)
  const loadRegions = useCallback(async () => {
    try {
      const regionData = await getAllRegions()
      setRegions(regionData)
    } catch (error) {
      console.error('Failed to load regions:', error)
    }
  }, [])

  // Initial region load
  useEffect(() => {
    loadRegions()
  }, [loadRegions])

  const handleAddBus = useCallback(
    async (data: CreateBusData): Promise<boolean> => {
      if (!data.name.trim() || !data.region.trim()) {
        toast({ variant: 'danger', message: t('bus.nameRegionRequired') })
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

        toast({ variant: 'success', message: t('bus.busCreated', { name: bus.name }) })

        refresh()
        loadRegions()
        sync()
        return true
      } catch (error) {
        console.error('Failed to create bus:', error)
        toast({ variant: 'danger', message: t('toast.createFailed') })
        return false
      }
    },
    [toast, t, refresh, loadRegions, sync]
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
        toast({ variant: 'success', message: t('bus.busDeleted', { name: bus.name }) })
        refresh()
        loadRegions()
        sync()
        return true
      } catch {
        toast({ variant: 'danger', message: t('toast.deleteFailed') })
        return false
      }
    },
    [toast, t, refresh, loadRegions, sync]
  )

  const handleArrivalToggle = useCallback(
    async (busId: string, busName: string, isCancel: boolean): Promise<boolean> => {
      try {
        if (isCancel) {
          await cancelBusArrival(busId)
          toast({ variant: 'success', message: t('bus.arrivalCancelled') })
        } else {
          await markBusAsArrived(busId)
          toast({ variant: 'success', message: t('bus.busArrived') })
        }

        refresh()
        sync()
        return true
      } catch (error) {
        console.error('Failed to toggle arrival:', error)
        toast({ variant: 'danger', message: t('toast.updateFailed') })
        return false
      }
    },
    [toast, t, refresh, sync]
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
    hasMore,
    loadMore,
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
