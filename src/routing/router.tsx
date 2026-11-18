import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { AdminClaimDetailPage } from '../features/admin-claims/AdminClaimDetailPage'
import { AdminClaimsPage } from '../features/admin-claims/AdminClaimsPage'
import { AgingReportPage } from '../features/admin/AgingReportPage'
import { MyBackupPage } from '../features/backup/MyBackupPage'
import { CompaniesPage } from '../features/admin/CompaniesPage'
import { CompanyPage } from '../features/admin/CompanyPage'
import { PeoplePage } from '../features/admin/PeoplePage'
import { PersonPage } from '../features/admin/PersonPage'
import { ApprovalQueuePage } from '../features/approval-queue/ApprovalQueuePage'
import { ClaimDetailPage } from '../features/claim-detail/ClaimDetailPage'
import { DepartmentFundsPage } from '../features/funds/DepartmentFundsPage'
import { TopupsPage } from '../features/funds/TopupsPage'
import { HistoryPage } from '../features/history/HistoryPage'
import { PaymentsPage } from '../features/payments/PaymentsPage'
import { LoginPage } from '../features/login/LoginPage'
import { AlertsPage } from '../features/notifications/AlertsPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { RequirePcaModel } from './RequirePcaModel'
import { SitePcaPage } from '../features/site-pca/SitePcaPage'
import { AdvancesPage } from '../features/advances/AdvancesPage'

// Department Funds / Top-ups: where people of a company with another petty cash model go instead.
const DEPARTMENT_PCA_ONLY: Record<string, string> = { site: '/site-pca', employee: '/advances' }

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        // Approver queues: HOD / Accountant / FM only. Admin has its own section below
        // (as in the Flutter app); employees use the Flutter app instead.
        element: <RequireRole allowed={['hod', 'accountant', 'head_accountant', 'finance_manager']} />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/queue/:stage', element: <ApprovalQueuePage /> },
              { path: '/queue/:stage/:id', element: <ClaimDetailPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/backup', element: <MyBackupPage /> },
              { path: '/admin/claims', element: <AdminClaimsPage /> },
              { path: '/admin/claims/:id', element: <AdminClaimDetailPage /> },
            ],
          },
        ],
      },
      {
        // Alerts + Profile: every role the web app serves (Flutter: Alerts / Profile tabs).
        element: <RequireRole allowed={['hod', 'accountant', 'head_accountant', 'finance_manager', 'admin']} />,
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
        // Top-ups / Funds (department petty cash): as in the Flutter drawer -- HOD (Funds),
        // Accountant, FM, Admin. Blue Rhine Contracting uses site petty cash instead, Professional
        // Signs employee advances: their people are sent there (as the Flutter router does).
        element: <RequireRole allowed={['hod', 'accountant', 'finance_manager', 'admin']} />,
        children: [
          {
            element: <RequirePcaModel redirects={DEPARTMENT_PCA_ONLY} />,
            children: [{ element: <AppShell />, children: [{ path: '/topups', element: <TopupsPage /> }] }],
          },
        ],
      },
      {
        // Department funds, read-only: Finance Manager, companies they cover.
        element: <RequireRole allowed={['finance_manager']} />,
        children: [
          {
            element: <RequirePcaModel redirects={DEPARTMENT_PCA_ONLY} />,
            children: [{ element: <AppShell />, children: [{ path: '/funds', element: <DepartmentFundsPage /> }] }],
          },
        ],
      },
      {
        // Blue Rhine Contracting petty cash (one per employee): Accounts, Head of Accountant,
        // Finance Manager, Admin -- same as the Flutter app's /site-pca.
        element: <RequireRole allowed={['accountant', 'head_accountant', 'finance_manager', 'admin']} />,
        children: [{ element: <AppShell />, children: [{ path: '/site-pca', element: <SitePcaPage /> }] }],
      },
      {
        // Professional Signs employee advances (PCA) + Accounts cash: HOD, Accounts, Accounts
        // Manager (finance_manager), Admin -- same as the Flutter app's /advances.
        element: <RequireRole allowed={['hod', 'accountant', 'finance_manager', 'admin']} />,
        children: [{ element: <AppShell />, children: [{ path: '/advances', element: <AdvancesPage /> }] }],
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
              { path: '/admin/aging', element: <AgingReportPage /> },
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
