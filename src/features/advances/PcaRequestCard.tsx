import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PiCheckCircle, PiMoney } from 'react-icons/pi'
import { PAYMENT_METHODS } from '../../api/payments'
import { PCA_PAYMENT_SOURCES, payPcaRequest, pcaStep, type PcaRequest, type PcaStep } from '../../api/pca'
import { useAuth } from '../../auth/useAuth'
import { formatMoney } from '../../lib/money'
import { errorMessage } from '../admin/adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from '../admin/AdminUi'
import {
  dateRange,
  formatWhen,
  hasPcaAction,
  invalidatePca,
  isAdvance,
  pcaActionLabel,
  pcaActionsFor,
  pcaStatusColor,
  pcaStatusLabel,
  projectLabel,
} from './pcaHelpers'

function money(amount: number, currency: string): string {
  return currency ? formatMoney(amount, currency) : amount.toFixed(2)
}

/** Port of PcaRequestTile (advances_screen.dart): one advance / top-up with its next step. */
export function PcaRequestCard({ request: r }: { request: PcaRequest }) {
  const { user } = useAuth()
  const role = user?.role
  const qc = useQueryClient()
  const actions = pcaActionsFor(r, role)
  const advance = isAdvance(r)
  const fund = r.fund
  const currency = fund?.currency ?? ''
  const project = projectLabel(fund)
  const done = r.status === 'paid'
  const [dialog, setDialog] = useState<'reject' | 'pay' | null>(null)

  const step = useMutation({
    mutationFn: (a: { step: PcaStep; remarks?: string }) => pcaStep(r.id, a.step, a.remarks),
    onSuccess: () => {
      setDialog(null)
      invalidatePca(qc)
    },
  })

  const approveStep: PcaStep = actions.hodApprove ? 'hod-approve' : 'manager-approve'
  const approveLabel = actions.hodApprove ? 'Approve' : advance ? 'Approve advance' : 'Verify'
  const showReject = !actions.pay || role === 'admin'
  const paidLine = [r.payment_source ? (PCA_PAYMENT_SOURCES[r.payment_source] ?? r.payment_source) : null, `ref ${r.payment_reference}`]
    .filter((s): s is string => !!s)
    .join(' · ')

  return (
    <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-brand-text ${
            advance ? 'bg-brand-lightblue' : 'bg-brand-warningsoft'
          }`}
        >
          {advance ? 'PETTY CASH' : 'TOP-UP'}
        </span>
        <span className={`text-[12.5px] font-bold ${pcaStatusColor(r)}`}>{pcaStatusLabel(r)}</span>
      </div>

      <div className="mt-2.5 text-xl font-extrabold text-brand-darkblue">{money(r.amount, currency)}</div>
      <div className="mt-1 text-[15px] font-bold text-brand-text">{r.employee_name ?? fund?.employee_name ?? 'Employee'}</div>
      {project && <div className="text-[13px] text-brand-textmuted">{project}</div>}
      {r.transaction_ids.length > 0 && (
        <div className="text-[12.5px] text-brand-textmuted">
          {r.transaction_ids.length} approved bill{r.transaction_ids.length === 1 ? '' : 's'}
        </div>
      )}
      {r.remarks && r.remarks.trim() && <p className="mt-1.5 text-[13px] text-brand-text">{r.remarks.trim()}</p>}
      {done && r.payment_reference && r.payment_reference.length > 0 && (
        <p className="mt-1.5 text-[12.5px] text-brand-textmuted">{paidLine}</p>
      )}

      {r.history.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[13px] font-bold text-brand-darkblue">History ({r.history.length})</summary>
          <ul className="mt-1 space-y-1.5">
            {[...r.history].reverse().map((h, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-brand-text">
                    {[pcaActionLabel(h.action, advance), h.actor_name].filter((s) => !!s).join(' · ')}
                  </div>
                  {h.comment && h.comment.trim() && (
                    <div className="text-[12.5px] text-brand-textmuted">{h.comment.trim()}</div>
                  )}
                </div>
                <div className="whitespace-nowrap text-[11.5px] text-brand-textmuted">{formatWhen(h.at)}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {hasPcaAction(actions) && (
        <div className="mt-3 flex gap-2">
          {actions.pay ? (
            <button
              type="button"
              disabled={step.isPending}
              onClick={() => setDialog('pay')}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PiMoney size={18} />
              Record payment
            </button>
          ) : (
            <PrimaryButton
              className="flex-1"
              disabled={step.isPending}
              onClick={() => step.mutate({ step: approveStep })}
            >
              {step.isPending && step.variables?.step !== 'reject' ? 'Saving…' : approveLabel}
            </PrimaryButton>
          )}
          {showReject && (
            <OutlineButton
              className="flex-1"
              disabled={step.isPending}
              onClick={() => {
                step.reset()
                setDialog('reject')
              }}
            >
              Reject
            </OutlineButton>
          )}
        </div>
      )}

      {step.error && dialog !== 'reject' && (
        <p className="mt-2 text-sm text-brand-danger">{errorMessage(step.error, 'Action failed.')}</p>
      )}

      {dialog === 'reject' && (
        <RejectReasonDialog
          busy={step.isPending}
          error={step.error ? errorMessage(step.error) : null}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => step.mutate({ step: 'reject', remarks: reason })}
        />
      )}
      {dialog === 'pay' && <PayRequestDialog request={r} onClose={() => setDialog(null)} />}
    </div>
  )
}

/** _ReasonDialog: a reason is required to reject. */
function RejectReasonDialog({
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
    <Modal title="Reject" onClose={onClose}>
      <label className="block text-sm font-medium text-brand-text">
        Reason *
        <textarea autoFocus rows={3} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      {error && <p className="mt-2 text-sm text-brand-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <OutlineButton onClick={onClose}>Cancel</OutlineButton>
        <PrimaryButton disabled={reason.length === 0 || busy} onClick={() => onSubmit(reason)}>
          {busy ? 'Rejecting…' : 'Reject'}
        </PrimaryButton>
      </div>
    </Modal>
  )
}

/** _PayRequestSheet: the Accounts Manager records how an approved advance / top-up was paid. */
function PayRequestDialog({ request: r, onClose }: { request: PcaRequest; onClose: () => void }) {
  const qc = useQueryClient()
  const [{ today, yearAgo }] = useState(dateRange)
  const [source, setSource] = useState('bank')
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(today)
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const currency = r.fund?.currency ?? ''

  const pay = useMutation({
    mutationFn: () =>
      payPcaRequest(r.id, {
        payment_source: source,
        payment_method: method,
        payment_reference: reference.trim(),
        payment_date: date,
        remarks: remarks.trim() ? remarks.trim() : null,
      }),
    onSuccess: () => {
      invalidatePca(qc)
      onClose()
    },
  })

  function submit() {
    if (!reference.trim()) {
      setFormError('Enter the payment reference')
      return
    }
    setFormError(null)
    pay.mutate()
  }

  const error = formError ?? (pay.error ? errorMessage(pay.error) : null)
  const subtitle = [r.employee_name ?? r.fund?.employee_name, projectLabel(r.fund)].filter((s): s is string => !!s).join(' · ')

  return (
    <Modal title={isAdvance(r) ? 'Pay advance' : 'Pay top-up'} onClose={onClose}>
      <div className="space-y-3">
        {subtitle && <p className="text-sm text-brand-textmuted">{subtitle}</p>}
        <div className="text-2xl font-extrabold text-brand-darkblue">{money(r.amount, currency)}</div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-brand-text">Paid from</legend>
          {Object.entries(PCA_PAYMENT_SOURCES).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-brand-divider px-3 py-2">
              <input
                type="radio"
                name="pca-source"
                value={value}
                checked={source === value}
                disabled={pay.isPending}
                onChange={() => setSource(value)}
              />
              <span className="text-sm text-brand-text">{label}</span>
            </label>
          ))}
        </fieldset>
        <label className="block text-sm font-medium text-brand-text">
          Payment method
          <select
            value={method}
            disabled={pay.isPending}
            onChange={(e) => setMethod(e.target.value)}
            className={`${inputClass} mt-1`}
          >
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Payment reference *
          <input
            value={reference}
            disabled={pay.isPending}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transfer or withdrawal number"
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Payment date
          <input
            type="date"
            value={date}
            min={yearAgo}
            max={today}
            disabled={pay.isPending}
            onChange={(e) => setDate(e.target.value || today)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Remarks (optional)
          <input
            value={remarks}
            disabled={pay.isPending}
            onChange={(e) => setRemarks(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <button
            type="button"
            disabled={pay.isPending}
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PiCheckCircle size={18} />
            {pay.isPending ? 'Saving…' : 'Mark as paid'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
