import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchPayments,
  PAYMENT_METHODS,
  payableFor,
  recordPayment,
  type PayableClaim,
  type PaymentClaim,
} from '../../api/payments'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { ClaimRef } from '../../components/ClaimRef'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { RegionFilterSelect } from '../../components/RegionFilterSelect'
import { formatMoney } from '../../lib/money'
import { initialRegionFilter, regionFilterOptions } from '../../lib/regionFilter'
import { errorMessage } from '../admin/adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from '../admin/AdminUi'
import { useAdminRegions } from '../admin/useAdminQueries'

type Status = 'unpaid' | 'paid'

function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Port of payments_screen.dart: Finance Manager / Admin record reimbursement payments. */
export function PaymentsPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('unpaid')
  // null = all regions; starts on the signed-in company for multi-company people.
  const [region, setRegion] = useState<string | null>(() => initialRegionFilter(user))
  const [paying, setPaying] = useState<PaymentClaim | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Filtered server-side, so the options come from the company list, not the loaded page.
  // A Finance Manager only gets the companies they cover (payment_service scopes the list).
  const companies = useAdminRegions()
  const regions = regionFilterOptions(user, (companies.data ?? []).map((r) => r.region_code))
  const regionCode = region !== null && regions.includes(region) ? region : null

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', status, regionCode],
    queryFn: () => fetchPayments({ status, regionCode }),
  })

  const totals = Object.entries(data?.totals ?? {})
    .map(([cur, amt]) => formatMoney(amt, cur))
    .join(' · ')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">Payments</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-brand-divider">
            {(
              [
                ['unpaid', 'Waiting for payment'],
                ['paid', 'Paid'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`px-3 py-1 text-sm font-medium ${
                  status === value ? 'bg-brand-darkblue text-white' : 'bg-brand-card text-brand-textmuted hover:bg-brand-lightblue'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {regions.length > 1 && <RegionFilterSelect options={regions} value={region} onChange={setRegion} />}
        </div>
      </div>

      {notice && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{notice}</div>
      )}

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load payments.')} />}

      {data && (
        <>
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${
              status === 'paid' ? 'bg-brand-lightblue' : 'bg-brand-warningsoft'
            }`}
          >
            <span className="font-semibold text-brand-text">
              {data.total} {data.total === 1 ? 'claim' : 'claims'} {status === 'paid' ? 'paid' : 'to pay'}
            </span>
            {totals && <span className="font-bold text-brand-text">{totals}</span>}
          </div>

          {data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-textmuted">
              {status === 'paid' ? 'No paid claims yet.' : 'No approved claims waiting for payment.'}
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-brand-divider bg-brand-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
                  <tr>
                    <th className="px-3 py-2">Invoice / claim</th>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Region</th>
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2 text-right">To pay</th>
                    <th className="px-3 py-2">{status === 'paid' ? 'Paid' : 'Approved'}</th>
                    {status === 'paid' && <th className="px-3 py-2">Payment</th>}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => {
                    const pay = payableFor(c)
                    const billTotal = c.total_amount ?? c.amount + c.vat_amount
                    return (
                      <tr key={c.id} className="border-t border-brand-divider hover:bg-brand-background">
                        <td className="px-3 py-2">
                          {user?.role === 'finance_manager' ? (
                            <Link to={`/queue/finance_manager/${c.id}`} className="hover:opacity-80">
                              <ClaimRef id={c.id} billNumber={c.bill_number} link />
                            </Link>
                          ) : (
                            <ClaimRef id={c.id} billNumber={c.bill_number} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-brand-text">{c.employee_name}</td>
                        <td className="px-3 py-2 text-brand-textmuted">{c.region_code ?? '—'}</td>
                        <td className="px-3 py-2 text-brand-text">{c.vendor_name ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="font-semibold text-brand-text">{formatMoney(pay.amount, pay.currency)}</div>
                          {pay.currency.toUpperCase() !== c.currency.toUpperCase() && (
                            <div className="text-xs text-brand-textmuted">Bill {formatMoney(billTotal, c.currency)}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-brand-textmuted">
                          {shortDate(status === 'paid' ? c.payment?.payment_date : c.decided_at)}
                        </td>
                        {status === 'paid' && (
                          <td className="px-3 py-2 text-brand-darkblue">
                            {c.payment
                              ? `${c.payment.payment_method_label ?? c.payment.payment_method} · ref ${c.payment.payment_reference}`
                              : '—'}
                          </td>
                        )}
                        <td className="px-3 py-2 text-right">
                          {status === 'unpaid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setNotice(null)
                                setPaying(c)
                              }}
                              className="rounded-md bg-brand-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                              Record payment
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {paying && (
        <RecordPaymentDialog
          claim={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setNotice(`Claim #${paying.id} marked paid. ${paying.employee_name} has been notified.`)
            setPaying(null)
          }}
        />
      )}
    </div>
  )
}

/** Port of _RecordPaymentSheet (payment_sheet.dart). Also used on the claim page. */
export function RecordPaymentDialog({
  claim,
  onClose,
  onSaved,
}: {
  claim: PayableClaim
  onClose: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  // Allowed payment dates: the last year up to today (fixed when the dialog opens).
  const [{ today, yearAgo }] = useState(() => {
    const now = new Date()
    const ago = new Date(now)
    ago.setFullYear(now.getFullYear() - 1)
    return { today: now.toISOString().slice(0, 10), yearAgo: ago.toISOString().slice(0, 10) }
  })
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(today)
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const pay = payableFor(claim)

  const save = useMutation({
    mutationFn: () =>
      recordPayment({
        transaction_id: claim.id,
        payment_method: method,
        payment_reference: reference.trim(),
        payment_date: date,
        remarks: remarks.trim() ? remarks.trim() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      onSaved()
    },
  })

  function submit() {
    if (!reference.trim()) {
      setFormError('Enter the payment reference')
      return
    }
    setFormError(null)
    save.mutate()
  }

  const error = formError ?? (save.error ? errorMessage(save.error) : null)

  return (
    <Modal title="Record payment" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-brand-textmuted">
          {claim.bill_number?.trim() ? `Invoice ${claim.bill_number.trim()} · ` : ''}Claim #{claim.id} · {claim.employee_name}
        </p>
        <div className="flex items-center justify-between rounded-md bg-brand-background px-3 py-2">
          <span className="text-sm text-brand-textmuted">Amount to pay</span>
          <span className="text-base font-extrabold text-brand-text">{formatMoney(pay.amount, pay.currency)}</span>
        </div>
        <label className="block text-sm font-medium text-brand-text">
          Payment method
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputClass} mt-1`}>
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
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transfer no., cheque no., payroll batch…"
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
            onChange={(e) => setDate(e.target.value || today)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm font-medium text-brand-text">
          Remarks (optional)
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={`${inputClass} mt-1`} />
        </label>
        {error && <p className="text-sm text-brand-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Mark as paid'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
