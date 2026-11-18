import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from '../../api/notifications'
import { isApproverRole, type Role } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { queueStagesFor } from '../../routing/roleLanding'
import { errorMessage } from '../admin/adminHelpers'

// `unread` is also the key of the badge query in AppShell.
const notificationKeys = {
  list: ['notifications'] as const,
  unread: ['notifications-unread'] as const,
}

// Same wording as notifications_screen.dart.
const TITLE_BY_TYPE: Record<string, string> = {
  submission: 'New claim to review',
  approval: 'Claim approved',
  approval_pending: 'Claim awaiting your approval',
  resubmit: 'Corrected claim resubmitted',
  rejection: 'Claim rejected',
  dispute: 'Claim disputed — correction needed',
  paid: 'Claim paid',
  test: 'Test notification',
}

type Kind = 'submitted' | 'approved' | 'rejected' | 'paid' | 'overdue' | 'info'

const KIND_BY_TYPE: Record<string, Kind> = {
  submission: 'submitted',
  approval: 'approved',
  approval_pending: 'submitted',
  resubmit: 'submitted',
  rejection: 'rejected',
  dispute: 'rejected',
  paid: 'paid',
}

const APPROVER_FACING = new Set(['submission', 'approval_pending', 'resubmit'])

// Top-up steps ('topup_verified_12') and low-fund alerts ('fund_low_3_0') open Top-ups / Funds.
// Professional Signs advances ('pca_advance_paid_7', 'pca_accounts_cash_low_2_0') open Advances;
// Blue Rhine Contracting petty cash ('pca_site_requested_4') opens Petty cash.
const isPcaType = (type: string) => type.startsWith('pca_')
const isFundType = (type: string) => type.startsWith('topup_') || type.startsWith('fund_low_') || isPcaType(type)

function fundRoute(type: string): string {
  if (type.startsWith('pca_site_')) return type.startsWith('pca_site_set_') ? '/site-pca' : '/site-pca?tab=topups'
  if (type.startsWith('pca_accounts_cash_')) return '/advances?tab=accounts-cash'
  if (isPcaType(type)) return '/advances'
  return '/topups'
}

// SLA alerts carry the step and a visit stamp: 'slaw_hod_1795..' (overdue warning to the
// approver) and 'slae_hod_1795..' (escalation to the next step + Admin).
const isSlaWarning = (type: string) => type.startsWith('slaw_')
const isSlaEscalation = (type: string) => type.startsWith('slae_')
const isSla = (type: string) => isSlaWarning(type) || isSlaEscalation(type)

// "You are the backup approver for Rashid" ('delegation_12'): opens the backup's own queue.
const isBackupType = (type: string) => type.startsWith('delegation_')

function fundKind(type: string): Kind {
  if (type.startsWith('topup_approved') || type.includes('_paid_')) return 'approved'
  if (type.startsWith('topup_rejected') || type.startsWith('topup_returned') || type.includes('_rejected_')) {
    return 'rejected'
  }
  return 'info'
}

const KIND_STYLE: Record<Kind, { icon: string; style: string }> = {
  approved: { icon: '✓', style: 'bg-brand-successsoft text-brand-success' },
  rejected: { icon: '✕', style: 'bg-red-50 text-brand-danger' },
  paid: { icon: '$', style: 'bg-brand-lightblue text-brand-darkblue' },
  submitted: { icon: '•', style: 'bg-orange-100 text-brand-orange' },
  overdue: { icon: '!', style: 'bg-red-50 text-brand-danger' },
  info: { icon: '•', style: 'bg-orange-100 text-brand-orange' },
}

/**
 * Where a notification opens on the web. Mirrors _routeFor in notifications_screen.dart,
 * adapted to web routes: claim views live under the approver's queue (read-only once it
 * has moved on), and Admin has no claim pages here.
 */
function routeFor(row: NotificationRow, role: Role): string | null {
  const type = row.type ?? 'test'
  if (isFundType(type)) return fundRoute(type)
  const stages = queueStagesFor(role).map((s) => s.stage)
  if (isBackupType(type)) return stages.length > 0 ? `/queue/${stages[0]}` : null
  if (row.transaction_id == null || type === 'test') return null
  if (stages.length === 0) return role === 'admin' && isSla(type) ? '/admin/aging' : null
  // Actionable (the bill is still at a step this user acts on, e.g. as someone's backup):
  // open it at that step so the decision buttons show.
  const stage =
    (APPROVER_FACING.has(type) || isSla(type)) && row.actionable && row.current_stage ? row.current_stage : stages[0]
  return `/queue/${stage}/${row.transaction_id}`
}

function bodyOf(message: string): string {
  const parts = message.split('\n\n')
  return parts.length > 1 ? parts.slice(1).join('\n\n') : message
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Port of NotificationsScreen: the in-app feed, newest first. */
export function AlertsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = user?.role ?? 'employee'
  const approver = isApproverRole(role)

  const { data, isLoading, error } = useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => fetchNotifications(50),
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: notificationKeys.list })
    qc.invalidateQueries({ queryKey: notificationKeys.unread })
  }

  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh })

  async function open(row: NotificationRow, route: string | null) {
    if (row.status !== 'read') {
      try {
        await markNotificationRead(row.id)
      } finally {
        refresh()
      }
    }
    if (route) navigate(route)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">Notifications</h1>
        <button
          type="button"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || !data?.some((n) => n.status !== 'read')}
          className="rounded-md border border-brand-divider bg-brand-card px-3 py-1.5 text-sm font-semibold text-brand-darkblue hover:bg-brand-lightblue disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load notifications.')} />}
      {markAll.error && <ErrorBanner message={errorMessage(markAll.error)} />}

      {data && data.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-base font-bold text-brand-text">
            {approver ? 'No claims waiting for review' : 'No notifications yet'}
          </p>
          <p className="mt-2 text-sm text-brand-textmuted">
            {approver ? 'New salesman submissions will show up here.' : 'Updates on your claims will appear here.'}
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-2.5">
          {data.map((row) => {
            const type = row.type ?? 'test'
            const message = row.message ?? ''
            const fund = isFundType(type)
            const title =
              TITLE_BY_TYPE[type] ??
              (isSlaWarning(type)
                ? 'Approval overdue'
                : isSlaEscalation(type)
                  ? 'Approval escalated'
                  : fund || isBackupType(type)
                    ? message.split('\n\n')[0].trim()
                    : 'Notification')
            const kind = KIND_BY_TYPE[type] ?? (isSla(type) ? 'overdue' : fund ? fundKind(type) : 'info')
            const unread = row.status !== 'read'
            const route = routeFor(row, role)
            const when = formatWhen(row.sent_at)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => open(row, route)}
                  className={`flex w-full items-start gap-3 rounded-xl border bg-brand-card p-3.5 text-left hover:bg-brand-background ${
                    unread ? 'border-brand-darkblue' : 'border-brand-divider'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${KIND_STYLE[kind].style}`}
                  >
                    {KIND_STYLE[kind].icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-brand-text">{title}</span>
                    <span className="mt-1 block whitespace-pre-line text-sm text-brand-textmuted">{bodyOf(message)}</span>
                    {when && <span className="mt-1.5 block text-xs text-brand-textmuted">{when}</span>}
                  </span>
                  {route && <span className="self-center text-brand-textmuted">›</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
