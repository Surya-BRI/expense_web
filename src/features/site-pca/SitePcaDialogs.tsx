import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import type { RegionConfig } from '../../api/adminOrg'
import {
  fetchSiteReplenishableBills,
  paySiteTopup,
  requestSiteTopup,
  setSitePot,
  type SitePaymentMethod,
  type SitePerson,
  type SitePot,
  type SiteRequest,
} from '../../api/sitePca'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { baseCurrencyForRegion, errorMessage } from '../admin/adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from '../admin/AdminUi'
import { invalidateSitePca, isPositive, parseMoneyInput, siteKeys, todayYmd, useSitePeople } from './sitePcaHelpers'

// Ports of the bottom sheets in site_pca_screen.dart: _SetPotSheet, _PrepareTopupSheet,
// _PaySheet and _askText. Same wording and checks as the app.

/**
 * Set or change an employee's petty cash. With `pot` it changes that one; with `employee` the
 * employee is fixed (opened from their page); with neither, pick the employee.
 */
export function SetPettyCashDialog({
  region,
  pot,
  employee,
  onClose,
}: {
  region: RegionConfig
  pot?: SitePot | null
  employee?: SitePerson | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const editing = pot != null
  const fixedName = pot?.employee_name ?? employee?.display_name ?? null
  const needsPicker = !editing && employee == null
  const people = useSitePeople(region.id, needsPicker)
  const currency = (region.base_currency ?? '').trim() || pot?.currency || baseCurrencyForRegion(region)

  const [employeeId, setEmployeeId] = useState<number | null>(pot?.employee_id ?? employee?.id ?? null)
  const [amount, setAmount] = useState(pot ? pot.approved_limit.toFixed(2) : '')
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (body: { employeeId: number; amount: number }) =>
      setSitePot({
        regionId: region.id,
        employeeId: body.employeeId,
        amount: body.amount,
        remarks: remarks.trim() ? remarks.trim() : null,
      }),
    onSuccess: () => {
      invalidateSitePca(qc)
      onClose()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (employeeId == null) {
      setFormError('Pick the employee')
      return
    }
    const value = parseMoneyInput(amount)
    if (value == null) {
      setFormError('Enter the amount')
      return
    }
    setFormError(null)
    save.mutate({ employeeId, amount: value })
  }

  function pick(id: number | null) {
    setEmployeeId(id)
    // Someone who already has petty cash: start from their amount.
    const current = (people.data ?? []).find((p) => p.id === id)?.advance ?? 0
    if (current > 0) setAmount(current.toFixed(2))
  }

  const error = formError ?? (save.error ? errorMessage(save.error) : null) ?? (needsPicker && people.error ? errorMessage(people.error) : null)
  const busy = save.isPending

  return (
    <Modal title={editing ? 'Change petty cash' : 'Set petty cash'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-brand-textmuted">
          Live at once, for all the employee&apos;s sites. Their petty-cash bills come off it; a top-up brings it back
          to this amount.
        </p>

        {!needsPicker ? (
          <div>
            <div className="text-xs font-medium text-brand-textmuted">Employee</div>
            <div className="text-base font-bold text-brand-text">{fixedName ?? ''}</div>
          </div>
        ) : people.isLoading ? (
          <LoadingSpinner label="Loading employees…" />
        ) : (
          <label className="block text-sm font-medium text-brand-text">
            Employee *
            <select
              value={employeeId ?? ''}
              disabled={busy}
              onChange={(e) => pick(e.target.value ? Number(e.target.value) : null)}
              className={`${inputClass} mt-1`}
            >
              <option value="">Pick the employee</option>
              {(people.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {[p.display_name, p.department_name, p.advance > 0 ? formatMoney(p.advance, currency) : null]
                    .filter((s): s is string => !!s)
                    .join(' · ')}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm font-medium text-brand-text">
          Amount ({currency}) *
          <input
            autoFocus={!needsPicker}
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        <label className="block text-sm font-medium text-brand-text">
          Reason (optional)
          <input
            value={remarks}
            disabled={busy}
            onChange={(e) => setRemarks(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        {error && <p className="text-sm text-brand-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

/** The Accountant prepares a top-up from the employee's approved bills (all ticked to start). */
export function PrepareTopupDialog({
  pot,
  onClose,
  onDone,
}: {
  pot: SitePot
  onClose: () => void
  onDone?: (request: SiteRequest) => void
}) {
  const qc = useQueryClient()
  const bills = useQuery({
    queryKey: siteKeys.replenishable(pot.id),
    queryFn: () => fetchSiteReplenishableBills(pot.id),
  })
  // Every bill is ticked by default; `unticked` holds the ones cleared.
  const [unticked, setUnticked] = useState<Set<number>>(new Set())
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const list = bills.data ?? []
  const picked = list.filter((b) => !unticked.has(b.id))
  const total = picked.reduce((sum, b) => sum + b.amount, 0)

  const submit = useMutation({
    mutationFn: () =>
      requestSiteTopup(
        pot.id,
        picked.map((b) => b.id),
        remarks.trim() ? remarks.trim() : null,
      ),
    onSuccess: (request) => {
      invalidateSitePca(qc)
      onDone?.(request)
      onClose()
    },
  })

  function save() {
    if (picked.length === 0) {
      setFormError('Pick the approved bills to top up')
      return
    }
    setFormError(null)
    submit.mutate()
  }

  function toggle(id: number, on: boolean) {
    setUnticked((prev) => {
      const next = new Set(prev)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const busy = submit.isPending
  const error = formError ?? (submit.error ? errorMessage(submit.error) : null) ?? (bills.error ? errorMessage(bills.error) : null)

  return (
    <Modal title="Prepare top-up" onClose={onClose} wide>
      <div className="space-y-3">
        <p className="text-sm text-brand-textmuted">{pot.employee_name ?? ''}</p>

        {bills.isLoading ? (
          <LoadingSpinner label="Loading approved bills…" />
        ) : bills.data && list.length === 0 ? (
          <p className="text-sm text-brand-text">No approved bills left to top up.</p>
        ) : list.length > 0 ? (
          <ul className="max-h-72 divide-y divide-brand-divider overflow-y-auto rounded-md border border-brand-divider">
            {list.map((b) => {
              const currency = b.currency ?? pot.currency
              const partOf = b.bill_total != null && isPositive(Math.abs(b.bill_total - b.amount))
              const detail = [b.bill_date || null, partOf ? `part of ${formatMoney(b.bill_total as number, currency)}` : null]
                .filter((s): s is string => !!s)
                .join(' · ')
              return (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-brand-background">
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={busy}
                      checked={!unticked.has(b.id)}
                      onChange={(e) => toggle(b.id, e.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-brand-text">
                        Bill #{b.id} · {formatMoney(b.amount, currency)}
                      </span>
                      {detail && <span className="block text-xs text-brand-textmuted">{detail}</span>}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        ) : null}

        <label className="block text-sm font-medium text-brand-text">
          Remarks (optional)
          <input
            value={remarks}
            disabled={busy}
            onChange={(e) => setRemarks(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        {error && <p className="text-sm text-brand-danger">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton disabled={busy || picked.length === 0} onClick={save}>
            {busy ? 'Sending…' : `Send to Head of Accountant · ${formatMoney(total, pot.currency)}`}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}

const PAY_METHODS: { value: SitePaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash withdrawal' },
  { value: 'cheque', label: 'Cheque' },
]

/** Finance Manager: approve and record the cash withdrawal from the bank. */
export function PayTopupDialog({
  request,
  onClose,
  onDone,
}: {
  request: SiteRequest
  onClose: () => void
  onDone?: () => void
}) {
  const qc = useQueryClient()
  const currency = request.fund?.currency ?? 'AED'
  const [method, setMethod] = useState<SitePaymentMethod>('bank_transfer')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(() => todayYmd())
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const pay = useMutation({
    mutationFn: () =>
      paySiteTopup(request.id, {
        method,
        reference: reference.trim(),
        paymentDate: date || todayYmd(),
        remarks: remarks.trim() ? remarks.trim() : null,
      }),
    onSuccess: () => {
      invalidateSitePca(qc)
      onDone?.()
      onClose()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!reference.trim()) {
      setFormError('Enter the bank withdrawal reference')
      return
    }
    setFormError(null)
    pay.mutate()
  }

  const busy = pay.isPending
  const error = formError ?? (pay.error ? errorMessage(pay.error) : null)

  return (
    <Modal title="Approve & record payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-brand-textmuted">
          {formatMoney(request.amount, currency)} for {request.employee_name ?? ''}. Recording the cash withdrawal from the
          bank refills the petty cash.
        </p>

        <label className="block text-sm font-medium text-brand-text">
          Method
          <select
            value={method}
            disabled={busy}
            onChange={(e) => setMethod(e.target.value as SitePaymentMethod)}
            className={`${inputClass} mt-1`}
          >
            {PAY_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-brand-text">
          Bank reference *
          <input
            autoFocus
            value={reference}
            disabled={busy}
            placeholder="Withdrawal or transfer number"
            onChange={(e) => setReference(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        <label className="block text-sm font-medium text-brand-text">
          Date
          <input
            type="date"
            value={date}
            min={todayYmd(-365)}
            max={todayYmd()}
            disabled={busy}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        <label className="block text-sm font-medium text-brand-text">
          Remarks (optional)
          <input
            value={remarks}
            disabled={busy}
            onChange={(e) => setRemarks(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        {error && <p className="text-sm text-brand-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-brand-success px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Approve & record payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** _askText: one text field; OK stays disabled while a required field is empty. */
export function AskTextDialog({
  title,
  label,
  required,
  busy = false,
  error,
  onClose,
  onSubmit,
}: {
  title: string
  label: string
  required: boolean
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (text: string) => void
}) {
  const [text, setText] = useState('')
  const value = text.trim()
  const blocked = required && value.length === 0

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!blocked && !busy) onSubmit(value)
        }}
        className="space-y-3"
      >
        <label className="block text-sm font-medium text-brand-text">
          {label}
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton type="submit" disabled={blocked || busy}>
            {busy ? 'Saving…' : 'OK'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
