import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@conference/firebase', () => ({
  app: {},
  db: {},
  auth: {},
  functions: {},
  googleProvider: {},
  convertTimestamp: vi.fn(),
  Timestamp: {},
  isInAppBrowser: false,
}))

import { useCan } from './useProjectRole'
import * as AuthCtx from '../contexts/AuthContext'
import * as ProjectCtx from '../contexts/ProjectContext'

describe('useCan', () => {
  it('returns true when role allows action', () => {
    vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
      appUser: { uid: 'u1', systemRole: 'member' }
    } as any)
    vi.spyOn(ProjectCtx, 'useProject').mockReturnValue({
      currentProject: { id: 'p1', memberRoles: { u1: 'finance_ops' } }
    } as any)
    const { result } = renderHook(() => useCan('request.review'))
    expect(result.current).toBe(true)
  })

  it('returns false when role does not allow', () => {
    vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
      appUser: { uid: 'u1', systemRole: 'member' }
    } as any)
    vi.spyOn(ProjectCtx, 'useProject').mockReturnValue({
      currentProject: { id: 'p1', memberRoles: { u1: 'user' } }
    } as any)
    const { result } = renderHook(() => useCan('request.review'))
    expect(result.current).toBe(false)
  })
})
