import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/**
 * Sends people away from petty cash pages their company doesn't use, like the Flutter app's
 * router (lib/src/routing/app_router.dart): department Funds / Top-ups don't exist at Blue Rhine
 * Contracting (site petty cash) or Professional Signs (employee advances). Admin sees every
 * company, so is never redirected.
 */
export function RequirePcaModel({ redirects }: { redirects: Record<string, string> }) {
  const { user } = useAuth()
  const target = user && user.role !== 'admin' ? redirects[user.pca_model ?? ''] : undefined
  return target ? <Navigate to={target} replace /> : <Outlet />
}
