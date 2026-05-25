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

import { useProjectRole } from './useProjectRole'
import * as AuthCtx from '../contexts/AuthContext'
import * as ProjectCtx from '../contexts/ProjectContext'
import { AppUser, Project } from '../types'

function mock(appUser: Partial<AppUser> | null, project: Partial<Project> | null) {
  vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({ appUser: appUser as AppUser | null } as any)
  vi.spyOn(ProjectCtx, 'useProject').mockReturnValue({ currentProject: project as Project | null } as any)
}

describe('useProjectRole', () => {
  it('returns null when no user', () => {
    mock(null, { id: 'p1' })
    const { result } = renderHook(() => useProjectRole())
    expect(result.current).toBeNull()
  })

  it('returns null when no project selected', () => {
    mock({ uid: 'u1', systemRole: 'member' }, null)
    const { result } = renderHook(() => useProjectRole())
    expect(result.current).toBeNull()
  })

  it('super_admin returns admin on any project', () => {
    mock({ uid: 'u1', systemRole: 'super_admin' }, { id: 'p1', memberRoles: {} })
    const { result } = renderHook(() => useProjectRole())
    expect(result.current).toBe('admin')
  })

  it('reads from memberRoles when present', () => {
    mock(
      { uid: 'u1', systemRole: 'member' },
      { id: 'p1', memberRoles: { u1: 'approver_ops' } }
    )
    const { result } = renderHook(() => useProjectRole())
    expect(result.current).toBe('approver_ops')
  })

  it('returns null when user not in memberRoles', () => {
    mock(
      { uid: 'u2', systemRole: 'member' },
      { id: 'p1', memberRoles: { u1: 'admin' } }
    )
    const { result } = renderHook(() => useProjectRole())
    expect(result.current).toBeNull()
  })

})
