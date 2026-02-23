import { useState, useEffect, useRef } from 'react'
import { useBatchedInfiniteScrollWithRealtime, useParticipantFilter } from '../hooks'
import { getParticipantsPaginatedForHook, subscribeToParticipants } from '../services/firebase'
import type { Participant } from '../types'

export function useParticipantsTabLogic() {
  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Batched infinite scroll pagination with realtime sync
  const {
    displayedItems: paginatedParticipants,
    isLoading: isPaginationLoading,
    hasMore,
    loadMore
  } = useBatchedInfiniteScrollWithRealtime<Participant>({
    fetchBatchSize: 1000,
    displayBatchSize: 100,
    fetchFunction: getParticipantsPaginatedForHook,
    getItemId: (p) => p.id,
    subscribeFunction: subscribeToParticipants
  })

  // Use the filter hook with paginated data
  const participantFilter = useParticipantFilter({ data: paginatedParticipants })

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isPaginationLoading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isPaginationLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isPaginationLoading, loadMore])

  return {
    // Pagination
    isPaginationLoading,
    hasMore,
    loadMoreRef,

    // Filter
    participantFilter,

    // Export
    showExportMenu,
    setShowExportMenu
  }
}
