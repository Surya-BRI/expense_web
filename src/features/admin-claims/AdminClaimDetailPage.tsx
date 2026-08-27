import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchClaim } from '../../api/admin'
import { ApiError } from '../../api/client'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { stageLabel } from '../../lib/stageLabels'
import { ReceiptViewer } from '../claim-detail/ReceiptViewer'
import { HistoryTimeline } from '../claim-detail/HistoryTimeline'
import { useMarkPaidMutation } from './useMarkPaidMutation'

export function AdminClaimDetailPage() {
  const { id } = useParams<{ id: string }>()
  const claimId = Number(id)

  const { data: txn, isLoading, error } = useQuery({
    queryKey: ['admin-claim', claimId],
    queryFn: () => fetchClaim(claimId),
  })

  const markPaidMutation = useMarkPaidMutation(claimId)

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load claim.'} />
  }
  if (!txn) return null

  const canMarkPaid = txn.status === 'approved'
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
            </dl>
          </div>

          {canMarkPaid && (
            <div className="rounded-md border border-brand-divider bg-brand-card p-4">
              {markPaidMutation.error && (
                <ErrorBanner
                  message={
                    markPaidMutation.error instanceof ApiError
                      ? markPaidMutation.error.message
                      : 'Failed to mark as paid.'
                  }
                />
              )}
              <button
                type="button"
                disabled={markPaidMutation.isPending}
                onClick={() => markPaidMutation.mutate()}
                className="mt-2 rounded-md bg-brand-success px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {markPaidMutation.isPending ? 'Marking paid…' : 'Mark as paid'}
              </button>
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
    </div>
  )
}
