import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface PrivateRouteProps {
  children: React.ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect unapproved users to pending approval page
  if (user && user.isApproved === false) {
    return <Navigate to="/pending-approval" replace />
  }

  return <>{children}</>
}
