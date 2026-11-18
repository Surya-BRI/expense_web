import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  PiArrowCounterClockwise,
  PiArrowDownLeft,
  PiArrowUpRight,
  PiCheckCircle,
  PiPencilSimple,
  PiWarningCircle,
} from 'react-icons/pi'
import { refillAccountsCash, setAccountsCash, type AccountsCash, type AccountsCashEntry } from '../../api/pca'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { errorMessage } from '../admin/adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from '../admin/AdminUi'
import { ProgressBar } from './PcaUi'
import { dateRange, formatDay, invalidatePca, parseMoney, pcaKeys, useAccountsCash, usedShare } from './pcaHelpers'

/**
 * Port of AccountsCashView (accounts_cash_view.dart): the Accounts Department's own petty cash
 * (Professional Signs, PCA PDF section 6). "Direct payment by Accounts Department" (Process 2)
 * takes from it; the Accounts Manager refills it from the bank; the Accounts Manager or Admin
 * sets its amount. For the Accounts Manager, Accounts and Admin.
 */
export function AccountsCashPanel({ regionId }: { regionId: number }) {
  const { data: cash, isLoading, error } = useAccountsCash(regionId)
  const [dialog, setDialog] = useState<'refill' | 'set' | null>(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load the Accounts cash.')} />
  if (!cash) return null

  const canRefill = cash.can_refill && cash.configured
  return (
    <div className="max-w-3xl space-y-4">
      <BalanceCard cash={cash} />

      {(canRefill || cash.can_set) && (
        <div className="flex flex-wrap gap-2.5">
          {canRefill && (
            <button
              type="button"
              disabled={cash.to_refill <= 0}
              onClick={() => setDialog('refill')}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-success px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PiArrowCounterClockwise size={18} />
              Refill from bank
            </button>
          )}
          {cash.can_set && (
            <OutlineButton onClick={() => setDialog('set')} className="inline-flex flex-1 items-center justify-center gap-1.5 py-2">
              <PiPencilSimple size={18} />
              {cash.configured ? 'Change amount' : 'Set amount'}
            </OutlineButton>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-[15px] font-bold text-brand-text">Recent movements</h2>
        {cash.entries.length === 0 ? (
          <p className="py-4 text-sm text-brand-textmuted">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {cash.entries.map((e) => (
              <EntryRow key={e.id} entry={e} currency={cash.currency} />
            ))}
          </ul>
        )}
      </div>

      {dialog === 'set' && <SetAmountDialog cash={cash} onClose={() => setDialog(null)} />}
      {dialog === 'refill' && <RefillDialog cash={cash} onClose={() => setDialog(null)} />}
    </div>
  )
}

function BalanceCard({ cash }: { cash: AccountsCash }) {
  if (!cash.configured) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand-divider bg-brand-card p-4">
        <PiWarningCircle size={24} className="shrink-0 text-brand-orange" />
        <p className="text-sm text-brand-text">
          {cash.can_set
            ? 'Not set up yet. Set its amount so Accounts can pay by Process 2 (direct payment by Accounts Department).'
            : 'Not set up yet. Until the Accounts Manager or Admin sets its amount, pay by Process 1 (cash withdrawal from bank).'}
        </p>
      </div>
    )
  }
  const used = usedShare(cash.to_refill, cash.limit)
  const barColor = cash.low ? 'bg-brand-danger' : used >= 0.5 ? 'bg-brand-orange' : 'bg-brand-success'
  const figures: [string, number, boolean][] = [
    ['Paid out (Process 2)', cash.paid_out, false],
    ['Refilled', cash.refilled, false],
    ['To refill', cash.to_refill, cash.to_refill > 0],
  ]
  return (
    <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div className="text-sm font-semibold text-brand-textmuted">Accounts Department petty cash</div>
      <div className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-darkblue">
        {formatMoney(cash.available, cash.currency)}
      </div>
      <div className="text-sm text-brand-textmuted">left of {formatMoney(cash.limit, cash.currency)}</div>
      <div className="mt-2.5">
        <ProgressBar value={used} colorClass={barColor} thick />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {figures.map(([label, value, warn]) => (
          <div key={label}>
            <dt className="text-[11px] text-brand-textmuted">{label}</dt>
            <dd className={`text-sm font-bold ${warn ? 'text-brand-orange' : 'text-brand-text'}`}>
              {formatMoney(value, cash.currency)}
            </dd>
          </div>
        ))}
      </dl>
      {cash.low && <p className="mt-2.5 text-sm font-semibold text-brand-danger">Running low: refill it from the bank.</p>}
    </div>
  )
}

function EntryRow({ entry: e, currency }: { entry: AccountsCashEntry; currency: string }) {
  let Icon = PiPencilSimple
  let color = 'text-brand-textmuted'
  let title = 'Amount changed'
  let sign = e.amount < 0 ? '−' : '+'
  if (e.kind === 'payout') {
    Icon = PiArrowUpRight
    color = 'text-brand-orange'
    title =
      e.transaction_id != null
        ? `Paid bill #${e.transaction_id}${e.employee_name != null ? ` · ${e.employee_name}` : ''}`
        : `Paid advance request #${e.topup_id ?? ''}`
    sign = '−'
  } else if (e.kind === 'refill') {
    Icon = PiArrowDownLeft
    color = 'text-brand-success'
    title = 'Refilled from bank'
    sign = '+'
  }
  const sub = [
    e.date ? formatDay(e.date) : null,
    e.reference != null ? `ref ${e.reference}` : null,
    e.actor_name,
    e.remarks != null && e.kind !== 'payout' ? e.remarks : null,
  ]
    .filter((s): s is string => !!s)
    .join(' · ')
  return (
    <li className="flex items-center gap-3 rounded-xl border border-brand-divider bg-brand-card px-4 py-3">
      <Icon size={22} className={`shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-brand-text">{title}</div>
        {sub && <div className="text-[13px] text-brand-textmuted">{sub}</div>}
      </div>
      <div className={`whitespace-nowrap text-sm font-bold ${color}`}>
        {sign}
        {formatMoney(Math.abs(e.amount), currency)}
      </div>
    </li>
  )
}

/** _SetAmountDialog: Admin / Accounts Manager sets the account's amount (the new total). */
function SetAmountDialog({ cash, onClose }: { cash: AccountsCash; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(cash.limit > 0 ? cash.limit.toFixed(2) : '')
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (value: number) => setAccountsCash(cash.region_id, value, remarks.trim() ? remarks.trim() : null),
    onSuccess: (fresh) => {
      qc.setQueryData(pcaKeys.accountsCash(cash.region_id), fresh)
      invalidatePca(qc)
      onClose()
    },
  })

  function submit() {
    const value = parseMoney(amount)
    if (value == null || value < 0) {
      setFormError('Enter the amount')
      return
    }
    setFormError(null)
    save.mutate(value)
  }

  const error = formError ?? (save.error ? errorMessage(save.error) : null)
  return (
    <Modal title="Accounts Department petty cash" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-brand-text">
          Amount ({cash.currency}) *
          <input
            autoFocus
            inputMode="decimal"
            value={amount}
            disabled={save.isPending}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Reason (optional)
          <input
            value={remarks}
            disabled={save.isPending}
            onChange={(e) => setRemarks(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <OutlineButton disabled={save.isPending} onClick={onClose}>
            Cancel
          </OutlineButton>
          <PrimaryButton disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}

/** _RefillSheet: the Accounts Manager / Admin records money put back from the bank. */
function RefillDialog({ cash, onClose }: { cash: AccountsCash; onClose: () => void }) {
  const qc = useQueryClient()
  const [{ today, yearAgo }] = useState(dateRange)
  const [amount, setAmount] = useState(cash.to_refill.toFixed(2))
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(today)
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (value: number) =>
      refillAccountsCash(cash.region_id, {
        amount: value,
        reference: reference.trim(),
        refill_date: date,
        remarks: remarks.trim() ? remarks.trim() : null,
      }),
    onSuccess: (fresh) => {
      qc.setQueryData(pcaKeys.accountsCash(cash.region_id), fresh)
      invalidatePca(qc)
      onClose()
    },
  })

  function submit() {
    const value = parseMoney(amount)
    if (value == null || value <= 0) {
      setFormError('Enter the amount put back')
      return
    }
    if (!reference.trim()) {
      setFormError('Enter the bank reference')
      return
    }
    setFormError(null)
    save.mutate(value)
  }

  const error = formError ?? (save.error ? errorMessage(save.error) : null)
  const busy = save.isPending
  return (
    <Modal title="Refill from bank" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-brand-textmuted">
          {formatMoney(cash.to_refill, cash.currency)} paid out and not refilled yet
        </p>
        <label className="block text-sm font-medium text-brand-text">
          Amount ({cash.currency}) *
          <input
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Bank reference *
          <input
            value={reference}
            disabled={busy}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Withdrawal or transfer number"
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Date
          <input
            type="date"
            value={date}
            min={yearAgo}
            max={today}
            disabled={busy}
            onChange={(e) => setDate(e.target.value || today)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Remarks (optional)
          <input value={remarks} disabled={busy} onChange={(e) => setRemarks(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <OutlineButton disabled={busy} onClick={onClose}>
            Cancel
          </OutlineButton>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PiCheckCircle size={18} />
            {busy ? 'Saving…' : 'Record refill'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
