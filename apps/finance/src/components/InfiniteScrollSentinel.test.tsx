import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InfiniteScrollSentinel from './InfiniteScrollSentinel'

describe('InfiniteScrollSentinel', () => {
  beforeEach(() => {
    class IntersectionObserverMock {
      private callback: IntersectionObserverCallback

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }

      observe = (target: Element) => {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        )
      }

      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = '0px'
      thresholds = [0]
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests another page when the sentinel remains visible after loading', () => {
    const fetchNextPage = vi.fn()
    const { rerender } = render(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    )

    expect(fetchNextPage).toHaveBeenCalledTimes(1)

    rerender(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage
        fetchNextPage={fetchNextPage}
      />
    )
    expect(fetchNextPage).toHaveBeenCalledTimes(1)

    rerender(
      <InfiniteScrollSentinel
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    )
    expect(fetchNextPage).toHaveBeenCalledTimes(2)
  })
})
