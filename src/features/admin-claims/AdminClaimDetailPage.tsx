import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchClaim } from '../../api/admin'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { stageLabel } from '../../lib/stageLabels'
import { ReceiptViewer } from '../claim-detail/ReceiptViewer'
import { HistoryTimeline } from '../claim-detail/HistoryTimeline'
import { RecordPaymentDialog } from '../payments/PaymentsPage'

export function AdminClaimDetailPage() {
  const { id } = useParams<{ id: string }>()
  const claimId = Number(id)
  const { user } = useAuth()
  const [paying, setPaying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const { data: txn, isLoading, error } = useQuery({
    queryKey: ['admin-claim', claimId],
    queryFn: () => fetchClaim(claimId),
  })

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load claim.'} />
  }
  if (!txn) return null

  // Spec 5.5: paying records method (or KSA process), reference and date -- through the same
  // form as the Payments page (POST /api/payments), not a one-click "mark paid". Only the
  // Finance Manager pays here (payment_service checks the company); petty cash outside
  // Professional Signs has no payment step (payment_status 'not_applicable').
  const payable =
    txn.status === 'approved' &&
    !txn.payment &&
    (txn.payment_status ? txn.payment_status === 'unpaid' : txn.type !== 'petty_cash')
  const canRecordPayment = payable && user?.role === 'finance_manager'
  const total = txn.total_amount ?? txn.amount + txn.vat_amount

  return (
    <div className="space-y-6">
      <Link
        to="/admin/claims"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-textmuted hover:text-brand-darkblue hover:underline"
      >
        <span aria-hidden="true">←</span> Back to all claims
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[500px_minmax(0,1fr)] lg:items-start">
        <section className="space-y-3 lg:sticky lg:top-6">
          <h2 className="text-base font-semibold text-brand-text">Receipt</h2>
          <ReceiptViewer receipt={txn.receipt} />
        </section>

        <div className="space-y-4">
          <div className="rounded-md border border-brand-divider bg-brand-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold text-brand-text">{txn.vendor_name ?? 'No vendor'}</h1>
                <p className="text-sm text-brand-textmuted">{txn.employee_name}</p>
              </div>
              <StatusChip status={txn.status} />
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between text-brand-textmuted">
                <span>Amount excl. VAT</span>
                <span>{formatMoney(txn.amount, txn.currency)}</span>
              </div>
              <div className="flex justify-between text-brand-textmuted">
                <span>VAT</span>
                <span>{formatMoney(txn.vat_amount, txn.currency)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-brand-divider pt-2 font-semibold text-brand-text">
                <span>Total</span>
                <span>{formatMoney(total, txn.currency)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-brand-divider bg-brand-card p-4 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-brand-textmuted">Bill date</dt>
                <dd className="text-brand-text">
                  {txn.bill_date ? new Date(txn.bill_date).toLocaleDateString() : 'None'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-textmuted">Current stage</dt>
                <dd className="text-brand-text">{stageLabel(txn.current_stage)}</dd>
              </div>
              {txn.payment && (
                <div className="flex justify-between">
                  <dt className="text-brand-textmuted">Payment</dt>
                  <dd className="text-right text-brand-text">
                    {txn.payment.payment_method_label ?? txn.payment.payment_method} · ref {txn.payment.payment_reference}
                    {txn.payment.payment_date ? ` · ${new Date(txn.payment.payment_date).toLocaleDateString()}` : ''}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {notice && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{notice}</div>
          )}

          {payable && (
            <div className="rounded-md border border-brand-divider bg-brand-card p-4 text-sm">
              {canRecordPayment ? (
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null)
                    setPaying(true)
                  }}
                  className="rounded-md bg-brand-success px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Record payment
                </button>
              ) : (
                <span className="text-brand-textmuted">Approved – waiting for the Finance Manager to record the payment.</span>
              )}
            </div>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-brand-text">History</h2>
            <div className="rounded-md border border-brand-divider bg-brand-card p-4">
              <HistoryTimeline history={txn.history} />
            </div>
          </section>
        </div>
      </div>

      {paying && (
        <RecordPaymentDialog
          claim={txn}
          onClose={() => setPaying(false)}
          onSaved={() => {
            setPaying(false)
            setNotice(`Claim #${txn.id} marked paid. ${txn.employee_name} has been notified.`)
          }}
        />
      )}
    </div>
  )
}
