import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useProjectRole } from '../hooks/useProjectRole'
import { ProjectRole } from '../types'
import Spinner from './Spinner'

interface Props {
  children: React.ReactNode
  /**
   * If provided, the user's effective ProjectRole in the currently selected project
   * must be one of these. super_admin always passes (promoted to 'admin').
   * If omitted, any authenticated user passes (assignment guard already handles unassigned users).
   */
  requiredRoles?: ProjectRole[]
}

export default function ProtectedRoute({ children, requiredRoles }: Props) {
  const { user, appUser, loading: authLoading } = useAuth()
  const { currentProject } = useProject()
  const projectRole = useProjectRole()

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />

  if (requiredRoles) {
    if (!appUser) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>

    // If projects are still loading (no projects array yet AND user is supposed to have some),
    // show spinner instead of redirecting. The AssignmentGuard handles the truly-unassigned case.
    if (appUser.assignedProjectCount && appUser.assignedProjectCount > 0 && !currentProject) {
      return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>
    }

    if (projectRole == null || !requiredRoles.includes(projectRole)) {
      return <Navigate to="/my-requests" replace />
    }
  }

  return <>{children}</>
}
