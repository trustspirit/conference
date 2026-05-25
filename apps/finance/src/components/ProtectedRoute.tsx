import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
  const { user, appUser, loading } = useAuth()
  const projectRole = useProjectRole()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  if (requiredRoles) {
    if (!appUser) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      )
    }
    if (projectRole == null || !requiredRoles.includes(projectRole)) {
      return <Navigate to="/my-requests" replace />
    }
  }

  return <>{children}</>
}
