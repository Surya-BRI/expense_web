import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { AdminClaimDetailPage } from '../features/admin-claims/AdminClaimDetailPage'
import { AdminClaimsPage } from '../features/admin-claims/AdminClaimsPage'
import { ApprovalQueuePage } from '../features/approval-queue/ApprovalQueuePage'
import { ClaimDetailPage } from '../features/claim-detail/ClaimDetailPage'
import { LoginPage } from '../features/login/LoginPage'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        // Both hod and accountant are approver roles; finance_manager/admin are
        // out of scope for this web app (they use the Flutter app instead).
        element: <RequireRole allowed={['hod', 'accountant']} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/queue/:stage', element: <ApprovalQueuePage /> },
              { path: '/queue/:stage/:id', element: <ClaimDetailPage /> },
              { path: '/admin/claims', element: <AdminClaimsPage /> },
              { path: '/admin/claims/:id', element: <AdminClaimDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
