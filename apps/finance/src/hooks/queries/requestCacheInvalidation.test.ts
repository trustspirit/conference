import { describe, it, expect, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

vi.mock('@conference/firebase', () => ({
  app: {},
  db: {},
  auth: {},
  functions: {},
  googleProvider: {},
  convertTimestamp: vi.fn(),
  Timestamp: {},
  isInAppBrowser: false
}))

import { invalidateRequestCaches } from './useRequests'

/**
 * Regression guard for the settlement page's "toggle does nothing" bug: the
 * `byIds` query (`['requests', 'byIds', ...ids]`, used by `useRequestsByIds`)
 * does not share a prefix with `['requests', projectId]` or `['requests', requestId]`,
 * so it was silently skipped by `invalidateRequestCaches`. This test seeds all
 * three query shapes and asserts every one gets invalidated.
 */
describe('invalidateRequestCaches', () => {
  it('invalidates the byIds query along with the project and detail queries', () => {
    const client = new QueryClient()

    const byIdsKey = ['requests', 'byIds', 'r1', 'r2']
    const projectKey = ['requests', 'p1']
    const detailKey = ['requests', 'r1']

    client.setQueryData(byIdsKey, [])
    client.setQueryData(projectKey, [])
    client.setQueryData(detailKey, null)

    invalidateRequestCaches(client, 'p1', 'r1')

    // Regression guard: this is the assertion that would fail against the
    // pre-fix invalidation list, which never touched the `byIds` prefix.
    expect(client.getQueryState(byIdsKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(projectKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true)
  })
})
