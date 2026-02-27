import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../utils/constants'
import { isAdminOrSessionLeader, isLeaderRole, getDefaultRoute } from '../lib/roles'
import type { UserRole } from '../types'
import Spinner from './Spinner'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  )
}

export function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: UserRole[] }) {
  const { user, appUser, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (requiredRoles) {
    if (!appUser) return <LoadingScreen />
    if (!requiredRoles.includes(appUser.role!)) return <Navigate to={getDefaultRoute(appUser.role)} replace />
  }

  return <>{children}</>
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, needsProfile } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (needsProfile) return <Navigate to={ROUTES.COMPLETE_PROFILE} replace />
  if (!appUser?.role) return <Navigate to={ROUTES.COMPLETE_PROFILE} replace />

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth()
  if (!isAdminOrSessionLeader(appUser?.role)) return <Navigate to={getDefaultRoute(appUser?.role)} replace />
  return <>{children}</>
}

export function RequireLeader({
  children,
  requireApproved = false,
}: {
  children: React.ReactNode
  requireApproved?: boolean
}) {
  const { appUser } = useAuth()
  if (!isLeaderRole(appUser?.role) && !isAdminOrSessionLeader(appUser?.role)) {
    return <Navigate to={getDefaultRoute(appUser?.role)} replace />
  }
  if (requireApproved && appUser?.leaderStatus !== 'approved' && !isAdminOrSessionLeader(appUser?.role)) {
    return <Navigate to={ROUTES.LEADER_PENDING} replace />
  }
  return <>{children}</>
}

export function RequireApplicant({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth()
  if (appUser?.role !== 'applicant') return <Navigate to={getDefaultRoute(appUser?.role)} replace />
  return <>{children}</>
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, needsProfile } = useAuth()
  if (loading) return <LoadingScreen />
  if (user && needsProfile) return <Navigate to={ROUTES.COMPLETE_PROFILE} replace />
  if (user && appUser?.role) return <Navigate to={getDefaultRoute(appUser.role)} replace />
  return <>{children}</>
}

export function RequireIncompleteProfile({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, needsProfile } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (!needsProfile && appUser?.role) return <Navigate to={getDefaultRoute(appUser.role)} replace />
  return <>{children}</>
}
