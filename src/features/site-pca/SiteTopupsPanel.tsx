import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { RegionConfig } from '../../api/adminOrg'
import { approveSiteTopup, rejectSiteTopup, type SiteRequest } from '../../api/sitePca'
import type { Role } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { errorMessage } from '../admin/adminHelpers'
import { PrimaryButton } from '../admin/AdminUi'
import { AskTextDialog, PayTopupDialog } from './SitePcaDialogs'
import {
  invalidateSitePca,
  shortDate,
  siteStatusLabel,
  siteStatusStyle,
  topupActionsFor,
  useSiteTopups,
} from './sitePcaHelpers'

/**
 * Port of SiteTopupsView (site_pca_screen.dart): a site-model company's petty cash top-ups,
 * with the approve / pay / reject steps for the signed-in role. The ones waiting on this user
 * come first. Also Admin's company page tab for that company.
 */
export function SiteTopupsPanel({ region, role: roleProp }: { region: RegionConfig; role?: Role }) {
  const { user } = useAuth()
  const role = roleProp ?? user?.role ?? null
  const topups = useSiteTopups(region.id)
  const [notice, setNotice] = useState<string | null>(null)

  if (topups.isLoading) return <LoadingSpinner />
  if (topups.error) return <ErrorBanner message={errorMessage(topups.error, 'Failed to load top-ups.')} />

  const rows = topups.data ?? []
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm leading-snug text-brand-textmuted">
        No top-ups yet. The Accountant prepares one from an employee&apos;s approved bills.
      </p>
    )
  }

  const mine = (r: SiteRequest) => topupActionsFor(r, role).length > 0
  const sorted = [...rows.filter(mine), ...rows.filter((r) => !mine(r))]

  return (
    <div className="space-y-3">
      {notice && <SiteNotice text={notice} onClose={() => setNotice(null)} />}
      {sorted.map((r) => (
        <SiteTopupCard key={r.id} request={r} role={role} onDone={setNotice} />
      ))}
    </div>
  )
}

/** Green "done" line after an action (the app's snackbar). */
export function SiteNotice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-success/30 bg-brand-successsoft px-4 py-2.5 text-sm text-brand-success">
      <span>{text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="leading-none hover:opacity-70">
        ×
      </button>
    </div>
  )
}

type Dialog = 'approve' | 'reject' | 'pay' | null

/** _TopupCard: one site top-up with its history and the steps this role can take. */
export function SiteTopupCard({
  request: r,
  role,
  onDone,
}: {
  request: SiteRequest
  role: string | null
  onDone?: (message: string) => void
}) {
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<Dialog>(null)
  const currency = r.fund?.currency ?? 'AED'
  const actions = topupActionsFor(r, role)

  const step = useMutation({
    mutationFn: (a: { kind: 'approve'; remarks: string } | { kind: 'reject'; comment: string }) =>
      a.kind === 'approve'
        ? approveSiteTopup(r.id, a.remarks.length === 0 ? null : a.remarks)
        : rejectSiteTopup(r.id, a.comment),
    onSuccess: (_data, a) => {
      setDialog(null)
      invalidateSitePca(qc)
      onDone?.(a.kind === 'approve' ? 'Approved. Sent to the Finance Manager.' : 'Rejected.')
    },
  })

  function open(next: Dialog) {
    step.reset()
    setDialog(next)
  }

  const billCount = r.transaction_ids.length

  return (
    <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-lg font-extrabold text-brand-darkblue">{formatMoney(r.amount, currency)}</div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${siteStatusStyle(r.status)}`}>
          {siteStatusLabel(r.status)}
        </span>
      </div>

      <div className="mt-1 text-sm font-semibold text-brand-text">{r.employee_name ?? ''}</div>
      <div className="space-y-0.5 text-[12.5px] text-brand-textmuted">
        <div>
          {billCount} bill{billCount === 1 ? '' : 's'} · prepared by {r.requester_name ?? '—'}
        </div>
        {r.payment_reference && <div>Bank ref {r.payment_reference}</div>}
        {r.remarks && r.remarks.trim() && <div>&ldquo;{r.remarks}&rdquo;</div>}
      </div>

      {r.history.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12.5px] text-brand-textmuted">
          {r.history.map((h, i) => (
            <li key={i}>
              {'• '}
              {h.action}
              {h.actor_name ? ` by ${h.actor_name}` : ''}
              {h.at ? ` · ${shortDate(h.at)}` : ''}
              {h.comment && h.comment.trim() ? ` · ${h.comment}` : ''}
            </li>
          ))}
        </ul>
      )}

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {actions.includes('reject') && (
            <button
              type="button"
              disabled={step.isPending}
              onClick={() => open('reject')}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-brand-danger hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          <span className="flex-1" />
          {actions.includes('approve') && (
            <PrimaryButton disabled={step.isPending} onClick={() => open('approve')}>
              Approve
            </PrimaryButton>
          )}
          {actions.includes('pay') && (
            <button
              type="button"
              onClick={() => open('pay')}
              className="rounded-md bg-brand-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Approve &amp; record payment
            </button>
          )}
        </div>
      )}

      {dialog === 'approve' && (
        <AskTextDialog
          title="Approve top-up"
          label="Comment (optional)"
          required={false}
          busy={step.isPending}
          error={step.error ? errorMessage(step.error) : null}
          onClose={() => setDialog(null)}
          onSubmit={(remarks) => step.mutate({ kind: 'approve', remarks })}
        />
      )}
      {dialog === 'reject' && (
        <AskTextDialog
          title="Reject top-up"
          label="Reason *"
          required
          busy={step.isPending}
          error={step.error ? errorMessage(step.error) : null}
          onClose={() => setDialog(null)}
          onSubmit={(comment) => step.mutate({ kind: 'reject', comment })}
        />
      )}
      {dialog === 'pay' && (
        <PayTopupDialog
          request={r}
          onClose={() => setDialog(null)}
          onDone={() => onDone?.('Paid. The petty cash is back to its amount.')}
        />
      )}
    </div>
  )
}
