import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { stageLabel } from '../../lib/stageLabels'
import { DecisionActions } from './DecisionActions'
import { HistoryTimeline } from './HistoryTimeline'
import { ReceiptViewer } from './ReceiptViewer'
import { useClaimDetail } from './useClaimDetail'

export function ClaimDetailPage() {
  const { stage = '', id } = useParams<{ stage: string; id: string }>()
  const claimId = Number(id)
  const { data: txn, isLoading, error, refetch } = useClaimDetail(claimId)

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load claim.'} />
  }
  if (!txn) return null

  // Mirrors approval_detail_screen.dart's awaitingThisStage/awaitingPayment split:
  // decision actions only show when the claim is actually sitting at this stage.
  const awaitingThisStage =
    (txn.status === 'submitted' || txn.status === 'disputed') && txn.current_stage === stage
  const awaitingPayment = txn.status === 'approved'
  const total = txn.total_amount ?? txn.amount + txn.vat_amount

  return (
    <div className="space-y-6">
      <Link
        to={`/queue/${stage}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-textmuted hover:text-brand-darkblue hover:underline"
      >
        <span aria-hidden="true">←</span> Back to queue
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
                <span className="mt-1 inline-block rounded-full bg-brand-lightblue px-2 py-0.5 text-xs font-medium capitalize text-brand-darkblue">
                  {txn.type}
                </span>
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
                <dt className="text-brand-textmuted">Employee</dt>
                <dd className="text-brand-text">{txn.employee_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-textmuted">Category</dt>
                <dd className="text-brand-text">{txn.category_name ?? 'None'}</dd>
              </div>
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
              {txn.op_number && (
                <div className="flex justify-between">
                  <dt className="text-brand-textmuted">OP number</dt>
                  <dd className="text-brand-text">{txn.op_number}</dd>
                </div>
              )}
              {txn.remarks && (
                <div className="flex justify-between">
                  <dt className="text-brand-textmuted">Remarks</dt>
                  <dd className="text-brand-text">{txn.remarks}</dd>
                </div>
              )}
            </dl>
          </div>

          {txn.duplicate_warning && (
            <div className="rounded-xl bg-brand-warningsoft px-4 py-3 text-sm text-brand-text">
              Duplicate warning: {txn.duplicate_warning.message}
            </div>
          )}

          {!awaitingThisStage && !awaitingPayment && (
            <div className="rounded-xl bg-brand-warningsoft px-4 py-3 text-sm text-brand-text">
              This claim is not currently awaiting your action.
            </div>
          )}

          {awaitingThisStage && (
            <DecisionActions claimId={txn.id} stage={stage} onDecided={() => refetch()} />
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
