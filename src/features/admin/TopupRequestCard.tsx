import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { decideTopup, returnTopup, verifyTopup, type TopupRequest } from '../../api/adminOrg'
import { useAuth } from '../../auth/useAuth'
import { formatMoney } from '../../lib/money'
import {
  errorMessage,
  formatDateTime,
  fundCompanyName,
  topupActionLabel,
  topupStatusLabel,
  topupStatusStyle,
} from './adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from './AdminUi'
import { invalidateFunds } from './useAdminQueries'

type Action =
  | { kind: 'verify' }
  | { kind: 'return'; reason: string }
  | { kind: 'approve'; paymentReference: string | null }
  | { kind: 'reject' }

/** Port of TopupRequestTile (topups_screen.dart) with the Accounts / Finance / Admin actions. */
export function TopupRequestCard({ request: t }: { request: TopupRequest }) {
  const { user } = useAuth()
  const role = user?.role
  const canVerify = role === 'accountant' || role === 'admin'
  const canDecide = role === 'finance_manager' || role === 'admin'
  const currency = t.fund?.currency ?? ''
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<'return' | 'approve' | null>(null)

  const action = useMutation({
    mutationFn: (a: Action) => {
      switch (a.kind) {
        case 'verify':
          return verifyTopup(t.id)
        case 'return':
          return returnTopup(t.id, a.reason)
        case 'approve':
          return decideTopup(t.id, { approve: true, paymentReference: a.paymentReference })
        case 'reject':
          return decideTopup(t.id, { approve: false })
      }
    },
    onSuccess: () => {
      setDialog(null)
      invalidateFunds(qc)
    },
  })

  const returnReason = [...t.history].reverse().find((h) => h.action === 'returned')?.comment ?? null
  const subtitle = [t.fund?.department_name ?? t.department_name, t.requester_name]
    .filter((s): s is string => !!s)
    .join(' · ')

  return (
    <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-brand-darkblue">
            {currency ? formatMoney(t.amount, currency) : t.amount.toFixed(2)}
          </div>
          {t.fund && <div className="mt-0.5 text-sm font-bold text-brand-text">{fundCompanyName(t.fund)}</div>}
          {subtitle && <div className="text-sm text-brand-textmuted">{subtitle}</div>}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${topupStatusStyle(t.status)}`}>
          {topupStatusLabel(t.status)}
        </span>
      </div>

      <div className="mt-1 space-y-0.5 text-xs text-brand-textmuted">
        {t.transaction_ids.length > 0 && (
          <div>
            {t.transaction_ids.length} bill{t.transaction_ids.length === 1 ? '' : 's'} linked
          </div>
        )}
        {t.payment_reference && t.payment_reference.trim() && <div>Payment {t.payment_reference}</div>}
      </div>

      {t.remarks && t.remarks.trim() && <p className="mt-1.5 text-[13px] text-brand-text">{t.remarks}</p>}

      {t.status === 'returned' && returnReason && returnReason.trim() && (
        <div className="mt-2.5 rounded-lg bg-brand-warningsoft p-2.5 text-[13px]">
          Returned: {returnReason.trim()}. Fix it and raise a new request.
        </div>
      )}

      {t.history.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-bold text-brand-darkblue">History ({t.history.length})</summary>
          <ul className="mt-1 space-y-1.5">
            {[...t.history].reverse().map((h, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-brand-text">
                    {[topupActionLabel(h.action), h.actor_name].filter((s) => !!s).join(' · ')}
                  </div>
                  {h.comment && h.comment.trim() && (
                    <div className="text-[12.5px] text-brand-textmuted">{h.comment.trim()}</div>
                  )}
                </div>
                <div className="whitespace-nowrap text-[11.5px] text-brand-textmuted">{formatDateTime(h.at)}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {canVerify && t.status === 'submitted' && (
        <div className="mt-3 flex gap-2">
          <PrimaryButton disabled={action.isPending} onClick={() => action.mutate({ kind: 'verify' })}>
            Verify
          </PrimaryButton>
          <OutlineButton
            disabled={action.isPending}
            onClick={() => {
              action.reset()
              setDialog('return')
            }}
          >
            Return to HOD
          </OutlineButton>
        </div>
      )}

      {canDecide && (t.status === 'verified' || (role === 'admin' && t.status === 'submitted')) && (
        <div className="mt-3 flex gap-2">
          <PrimaryButton
            disabled={action.isPending}
            onClick={() => {
              action.reset()
              setDialog('approve')
            }}
          >
            Approve
          </PrimaryButton>
          <OutlineButton disabled={action.isPending} onClick={() => action.mutate({ kind: 'reject' })}>
            Reject
          </OutlineButton>
        </div>
      )}

      {action.error && !dialog && (
        <p className="mt-2 text-sm text-brand-danger">{errorMessage(action.error, 'Action failed.')}</p>
      )}

      {dialog === 'return' && (
        <ReturnReasonDialog
          busy={action.isPending}
          error={action.error ? errorMessage(action.error) : null}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => action.mutate({ kind: 'return', reason })}
        />
      )}
      {dialog === 'approve' && (
        <PaymentRefDialog
          busy={action.isPending}
          error={action.error ? errorMessage(action.error) : null}
          onClose={() => setDialog(null)}
          onSubmit={(ref) => action.mutate({ kind: 'approve', paymentReference: ref.length === 0 ? null : ref })}
        />
      )}
    </div>
  )
}

function ReturnReasonDialog({
  busy,
  error,
  onClose,
  onSubmit,
}: {
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [text, setText] = useState('')
  const reason = text.trim()
  return (
    <Modal title="Return to HOD" onClose={onClose}>
      <label className="block text-sm font-medium text-brand-text">
        Reason *
        <textarea
          autoFocus
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Receipt missing for one bill"
          className={`${inputClass} mt-1`}
        />
      </label>
      {error && <p className="mt-2 text-sm text-brand-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <OutlineButton onClick={onClose}>Cancel</OutlineButton>
        <PrimaryButton disabled={reason.length === 0 || busy} onClick={() => onSubmit(reason)}>
          {busy ? 'Returning…' : 'Return'}
        </PrimaryButton>
      </div>
    </Modal>
  )
}

function PaymentRefDialog({
  busy,
  error,
  onClose,
  onSubmit,
}: {
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (ref: string) => void
}) {
  const [text, setText] = useState('')
  return (
    <Modal title="Approve replenishment" onClose={onClose}>
      <p className="text-sm text-brand-textmuted">Optional payment reference for the common bank account.</p>
      <label className="mt-3 block text-sm font-medium text-brand-text">
        Payment reference
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      {error && <p className="mt-2 text-sm text-brand-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <OutlineButton onClick={onClose}>Cancel</OutlineButton>
        <PrimaryButton disabled={busy} onClick={() => onSubmit(text.trim())}>
          {busy ? 'Approving…' : 'Approve'}
        </PrimaryButton>
      </div>
    </Modal>
  )
}
