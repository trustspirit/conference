import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import Spinner from './Spinner'

interface Props {
  children: React.ReactNode
  requiredRoles?: UserRole[]
}

export default function ProtectedRoute({ children, requiredRoles }: Props) {
  const { user, appUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user || !appUser) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles && !requiredRoles.includes(appUser.role)) {
    return <Navigate to="/items" replace />
  }

  return <>{children}</>
}
