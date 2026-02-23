import { useState, useCallback, useEffect, useRef } from 'react'
import { Unsubscribe } from 'firebase/firestore'

export interface BatchedInfiniteScrollWithRealtimeOptions<T> {
  fetchBatchSize: number // How many items to fetch from server at once (e.g., 1000)
  displayBatchSize: number // How many items to display per scroll (e.g., 100)
  fetchFunction: (lastItem: T | null, batchSize: number) => Promise<{ data: T[]; hasMore: boolean }>
  getItemId: (item: T) => string
  // Real-time subscription function that calls callback with updated data
  subscribeFunction?: (callback: (data: T[]) => void) => Unsubscribe
}

export interface BatchedInfiniteScrollWithRealtimeReturn<T> {
  displayedItems: T[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

/**
 * Enhanced pagination hook with real-time Firebase sync
 *
 * This hook combines:
 * 1. Batched pagination (fetch 1000, display 100 at a time)
 * 2. Real-time updates via onSnapshot for currently loaded data
 *
 * Strategy:
 * - Initial load: Fetch first batch (e.g., 1000 items)
 * - Display: Show first 100 items
 * - Real-time sync: Subscribe to ALL currently fetched items (the 1000 in cache)
 * - Scroll: Display next 100 from cache
 * - Cache exhausted: Fetch next 1000, update subscription to cover new items
 *
 * @example
 * const { displayedItems, loadMore } = useBatchedInfiniteScrollWithRealtime({
 *   fetchBatchSize: 1000,
 *   displayBatchSize: 100,
 *   fetchFunction: getGroupsPaginated,
 *   getItemId: (group) => group.id,
 *   subscribeFunction: (callback) => subscribeToGroups(callback)
 * })
 */
export function useBatchedInfiniteScrollWithRealtime<T>({
  fetchBatchSize,
  displayBatchSize,
  fetchFunction,
  getItemId,
  subscribeFunction
}: BatchedInfiniteScrollWithRealtimeOptions<T>): BatchedInfiniteScrollWithRealtimeReturn<T> {
  // All items fetched from server (in batches of fetchBatchSize)
  const [cachedItems, setCachedItems] = useState<T[]>([])

  // Items currently displayed to user (in increments of displayBatchSize)
  const [displayedItems, setDisplayedItems] = useState<T[]>([])

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Whether more items exist on server
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true)

  // Track loaded IDs to prevent duplicates
  const loadedIdsRef = useRef<Set<string>>(new Set())

  // Prevent multiple simultaneous fetches
  const isFetchingRef = useRef(false)

  // Unsubscribe function for real-time listener
  const unsubscribeRef = useRef<Unsubscribe | null>(null)

  /**
   * Setup real-time listener for cached items
   * This subscribes to ALL items in the cache (e.g., all 1000 fetched items)
   */
  const setupRealtimeSync = useCallback(() => {
    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    // Only subscribe if we have a subscription function
    if (!subscribeFunction) return

    // Subscribe to real-time updates
    unsubscribeRef.current = subscribeFunction((updatedData) => {
      // Create a map of updated items by ID
      const updatedMap = new Map<string, T>()
      updatedData.forEach((item) => {
        updatedMap.set(getItemId(item), item)
      })

      // Update cached items with real-time data
      setCachedItems((prevCached) => {
        return prevCached.map((cachedItem) => {
          const id = getItemId(cachedItem)
          return updatedMap.has(id) ? updatedMap.get(id)! : cachedItem
        })
      })

      // Update displayed items with real-time data
      setDisplayedItems((prevDisplayed) => {
        return prevDisplayed.map((displayedItem) => {
          const id = getItemId(displayedItem)
          return updatedMap.has(id) ? updatedMap.get(id)! : displayedItem
        })
      })
    })
  }, [subscribeFunction, getItemId])

  /**
   * Fetches next batch from server
   */
  const fetchNextBatch = useCallback(async (): Promise<T[]> => {
    if (!hasMoreOnServer || isFetchingRef.current) {
      return []
    }

    isFetchingRef.current = true
    setIsLoading(true)

    try {
      const lastItem = cachedItems.length > 0 ? cachedItems[cachedItems.length - 1] : null
      const { data, hasMore } = await fetchFunction(lastItem, fetchBatchSize)

      // Filter out duplicates
      const uniqueData = data.filter((item) => {
        const id = getItemId(item)
        if (loadedIdsRef.current.has(id)) {
          return false
        }
        loadedIdsRef.current.add(id)
        return true
      })

      setHasMoreOnServer(hasMore)

      // Append to cache
      setCachedItems((prev) => [...prev, ...uniqueData])

      // Update real-time subscription to cover new items
      setupRealtimeSync()

      return uniqueData
    } catch (error) {
      console.error('Error fetching batch:', error)
      return []
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [cachedItems, fetchBatchSize, fetchFunction, getItemId, hasMoreOnServer, setupRealtimeSync])

  /**
   * Displays next chunk of items from cache
   * If cache is exhausted, fetches new batch first
   */
  const loadMore = useCallback(async (): Promise<void> => {
    const currentDisplayCount = displayedItems.length
    const currentCacheCount = cachedItems.length

    // Check if we have items in cache to display
    const itemsRemainingInCache = currentCacheCount - currentDisplayCount

    if (itemsRemainingInCache >= displayBatchSize) {
      // Display next chunk from cache
      const nextChunk = cachedItems.slice(
        currentDisplayCount,
        currentDisplayCount + displayBatchSize
      )
      setDisplayedItems((prev) => [...prev, ...nextChunk])
    } else if (itemsRemainingInCache > 0) {
      // Display remaining cache items
      const remainingItems = cachedItems.slice(currentDisplayCount)
      setDisplayedItems((prev) => [...prev, ...remainingItems])

      // Fetch next batch if there are more on server
      if (hasMoreOnServer) {
        const newBatch = await fetchNextBatch()

        // Display first chunk of new batch
        if (newBatch.length > 0) {
          const nextChunk = newBatch.slice(0, Math.min(displayBatchSize, newBatch.length))
          setDisplayedItems((prev) => [...prev, ...nextChunk])
        }
      }
    } else {
      // Cache is exhausted, fetch new batch
      if (hasMoreOnServer) {
        const newBatch = await fetchNextBatch()

        // Display first chunk of new batch
        if (newBatch.length > 0) {
          const nextChunk = newBatch.slice(0, Math.min(displayBatchSize, newBatch.length))
          setDisplayedItems((prev) => [...prev, ...nextChunk])
        }
      }
    }
  }, [displayedItems, cachedItems, displayBatchSize, hasMoreOnServer, fetchNextBatch])

  /**
   * Resets pagination state
   */
  const reset = useCallback((): void => {
    setCachedItems([])
    setDisplayedItems([])
    setHasMoreOnServer(true)
    loadedIdsRef.current.clear()
    isFetchingRef.current = false

    // Clean up subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  /**
   * Refreshes data by resetting and loading first batch
   */
  const refresh = useCallback(async (): Promise<void> => {
    reset()

    // Fetch first batch
    setIsLoading(true)
    isFetchingRef.current = true

    try {
      const { data, hasMore } = await fetchFunction(null, fetchBatchSize)

      // Track IDs
      data.forEach((item) => {
        loadedIdsRef.current.add(getItemId(item))
      })

      setHasMoreOnServer(hasMore)
      setCachedItems(data)

      // Display first chunk
      const firstChunk = data.slice(0, Math.min(displayBatchSize, data.length))
      setDisplayedItems(firstChunk)

      // Setup real-time sync for fetched items
      setupRealtimeSync()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [reset, fetchFunction, fetchBatchSize, displayBatchSize, getItemId, setupRealtimeSync])

  // Initial load
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  // Calculate if more items available (either in cache or on server)
  const hasMore = displayedItems.length < cachedItems.length || hasMoreOnServer

  return {
    displayedItems,
    isLoading,
    hasMore,
    loadMore,
    reset,
    refresh
  }
}
