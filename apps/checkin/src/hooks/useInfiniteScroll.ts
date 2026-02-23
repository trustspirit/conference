import { useState, useCallback, useEffect, useRef } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'

export interface InfiniteScrollOptions<T> {
  pageSize: number
  fetchFunction: (
    pageSize: number,
    cursor: QueryDocumentSnapshot | null
  ) => Promise<{ data: T[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }>
}

export interface InfiniteScrollReturn<T> {
  items: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

/**
 * Simple infinite scroll hook for cursor-based pagination
 * Unlike batched infinite scroll, this fetches and displays items immediately
 * without caching large batches
 *
 * @example
 * const { items, loadMore, hasMore } = useInfiniteScroll({
 *   pageSize: 50,
 *   fetchFunction: readAuditLogsPaginated
 * })
 */
export function useInfiniteScroll<T>({
  pageSize,
  fetchFunction
}: InfiniteScrollOptions<T>): InfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const isFetchingRef = useRef(false)

  /**
   * Fetches next page of items
   */
  const fetchNextPage = useCallback(
    async (isInitial: boolean = false): Promise<void> => {
      if (isFetchingRef.current) return
      if (!isInitial && !hasMore) return

      isFetchingRef.current = true

      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const cursor = isInitial ? null : cursorRef.current
        const result = await fetchFunction(pageSize, cursor)

        setItems((prev) => (isInitial ? result.data : [...prev, ...result.data]))
        cursorRef.current = result.lastDoc
        setHasMore(result.hasMore)
      } catch (error) {
        console.error('Error fetching page:', error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        isFetchingRef.current = false
      }
    },
    [fetchFunction, pageSize, hasMore]
  )

  /**
   * Loads more items (for infinite scroll trigger)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    await fetchNextPage(false)
  }, [fetchNextPage])

  /**
   * Resets pagination state
   */
  const reset = useCallback((): void => {
    setItems([])
    setHasMore(true)
    cursorRef.current = null
    isFetchingRef.current = false
  }, [])

  /**
   * Refreshes data by resetting and loading first page
   */
  const refresh = useCallback(async (): Promise<void> => {
    reset()
    await fetchNextPage(true)
  }, [reset, fetchNextPage])

  // Initial load
  useEffect(() => {
    fetchNextPage(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    reset,
    refresh
  }
}
