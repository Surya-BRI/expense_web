import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { Role } from '../api/types'
import { landingPathFor } from './roleLanding'

export function RequireRole({ allowed }: { allowed: Role[] }) {
  const { user } = useAuth()

  // RequireAuth (the parent route) already guarantees `user` is set here.
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to={user ? landingPathFor(user.role) : '/login'} replace />
  }

  return <Outlet />
}
