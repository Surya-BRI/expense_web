import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { AdminClaimDetailPage } from '../features/admin-claims/AdminClaimDetailPage'
import { AdminClaimsPage } from '../features/admin-claims/AdminClaimsPage'
import { CompaniesPage } from '../features/admin/CompaniesPage'
import { CompanyPage } from '../features/admin/CompanyPage'
import { PeoplePage } from '../features/admin/PeoplePage'
import { PersonPage } from '../features/admin/PersonPage'
import { ApprovalQueuePage } from '../features/approval-queue/ApprovalQueuePage'
import { ClaimDetailPage } from '../features/claim-detail/ClaimDetailPage'
import { TopupsPage } from '../features/funds/TopupsPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { PaymentsPage } from '../features/payments/PaymentsPage'
import { LoginPage } from '../features/login/LoginPage'
import { AlertsPage } from '../features/notifications/AlertsPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        // Approver queues: HOD / Accountant / FM only. Admin has its own section below
        // (as in the Flutter app); employees use the Flutter app instead.
        element: <RequireRole allowed={['hod', 'accountant', 'finance_manager']} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/queue/:stage', element: <ApprovalQueuePage /> },
              { path: '/queue/:stage/:id', element: <ClaimDetailPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/admin/claims', element: <AdminClaimsPage /> },
              { path: '/admin/claims/:id', element: <AdminClaimDetailPage /> },
            ],
          },
        ],
      },
      {
        // Alerts + Profile: every role the web app serves (Flutter: Alerts / Profile tabs).
        element: <RequireRole allowed={['hod', 'accountant', 'finance_manager', 'admin']} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/alerts', element: <AlertsPage /> },
              { path: '/profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        // Top-ups / Funds: as in the Flutter drawer -- HOD (Funds), Accountant, FM, Admin.
        element: <RequireRole allowed={['hod', 'accountant', 'finance_manager', 'admin']} />,
        children: [{ element: <AppShell />, children: [{ path: '/topups', element: <TopupsPage /> }] }],
      },
      {
        // Recording reimbursement payments: Finance Manager and Admin.
        element: <RequireRole allowed={['finance_manager', 'admin']} />,
        children: [{ element: <AppShell />, children: [{ path: '/payments', element: <PaymentsPage /> }] }],
      },
      {
        // Admin = organisation setup (Companies, People), as in the Flutter app.
        element: <RequireRole allowed={['admin']} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/admin', element: <CompaniesPage /> },
              { path: '/admin/companies/:id', element: <CompanyPage /> },
              { path: '/admin/people', element: <PeoplePage /> },
              { path: '/admin/people/:id', element: <PersonPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
