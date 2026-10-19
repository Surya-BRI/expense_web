import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import type { LineItem } from '../../api/types'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { stageLabel } from '../../lib/stageLabels'
import { DecisionActions } from './DecisionActions'
import { HistoryTimeline } from './HistoryTimeline'
import { ReceiptViewer } from './ReceiptViewer'
import { VendorResolvePanel } from './VendorResolvePanel'
import { useClaimDetail } from './useClaimDetail'

function LineItemsTable({
  items,
  currency,
  vatAmount,
  total,
}: {
  items: LineItem[]
  currency: string
  vatAmount: number
  total: number
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-brand-divider text-sm">
      <table className="w-full text-left">
        <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">OP</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((li) => (
            <tr key={li.id} className="border-t border-brand-divider">
              <td className="px-3 py-2 text-brand-textmuted">{li.line_no}</td>
              <td className="px-3 py-2 text-brand-text">{li.description}</td>
              <td className="px-3 py-2 text-brand-textmuted">{li.category_name ?? '—'}</td>
              <td className="px-3 py-2 text-brand-textmuted">{li.op_number ?? '—'}</td>
              <td className="px-3 py-2 text-right text-brand-textmuted">{li.quantity ?? '—'}</td>
              <td className="px-3 py-2 text-right text-brand-text">{formatMoney(li.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-brand-divider bg-brand-background text-xs">
          <tr>
            <td colSpan={5} className="px-3 py-2 text-right text-brand-textmuted">VAT</td>
            <td className="px-3 py-2 text-right text-brand-textmuted">{formatMoney(vatAmount, currency)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="px-3 py-2 text-right font-semibold text-brand-text">Total</td>
            <td className="px-3 py-2 text-right font-semibold text-brand-text">{formatMoney(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function ClaimDetailPage() {
  const { stage = '', id } = useParams<{ stage: string; id: string }>()
  const claimId = Number(id)
  const { data: txn, isLoading, error, refetch } = useClaimDetail(claimId)
  const [historyOpen, setHistoryOpen] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load claim.'} />
  }
  if (!txn) return null

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
          <div className="rounded-md border border-brand-divider bg-brand-card">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-brand-text hover:bg-brand-background"
            >
              <span>Activity history</span>
              <span className="text-brand-textmuted">{historyOpen ? '▲' : '▼'}</span>
            </button>
            {historyOpen && (
              <div className="border-t border-brand-divider p-4">
                <HistoryTimeline history={txn.history} />
              </div>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <div className="rounded-md border border-brand-divider bg-brand-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold text-brand-text">{txn.vendor_name ?? 'No vendor'}</h1>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-brand-lightblue px-2 py-0.5 text-xs font-medium capitalize text-brand-darkblue">
                    {txn.type}
                  </span>
                  {txn.line_mode === 'multiple' && (
                    <span className="rounded-full bg-brand-lightblue px-2 py-0.5 text-xs font-medium text-brand-darkblue">
                      Multiple items
                    </span>
                  )}
                </div>
              </div>
              <StatusChip status={txn.status} />
            </div>

            {txn.line_mode === 'multiple' && txn.line_items.length > 0 ? (
              <LineItemsTable items={txn.line_items} currency={txn.currency} vatAmount={txn.vat_amount} total={total} />
            ) : (
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
            )}
          </div>

          <div className="rounded-md border border-brand-divider bg-brand-card p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Employee</dt>
                <dd className="mt-0.5 font-medium text-brand-text">{txn.employee_name}</dd>
              </div>
              {txn.region_code && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Region</dt>
                  <dd className="mt-0.5">
                    <span className="rounded-full bg-brand-lightblue px-2 py-0.5 text-xs font-semibold text-brand-darkblue">
                      {txn.region_code}
                    </span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Category</dt>
                <dd className="mt-0.5 text-brand-text">{txn.category_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Bill date</dt>
                <dd className="mt-0.5 text-brand-text">
                  {txn.bill_date ? new Date(txn.bill_date).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Current stage</dt>
                <dd className="mt-0.5 font-medium text-brand-text">{stageLabel(txn.current_stage)}</dd>
              </div>
              {txn.bill_number && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Bill number</dt>
                  <dd className="mt-0.5 text-brand-text">{txn.bill_number}</dd>
                </div>
              )}
              {txn.op_number && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">OP number</dt>
                  <dd className="mt-0.5 text-brand-text">{txn.op_number}</dd>
                </div>
              )}
              {txn.remarks && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Remarks</dt>
                  <dd className="mt-0.5 text-brand-text">{txn.remarks}</dd>
                </div>
              )}
            </dl>
          </div>

          {txn.vendor_unmatched && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">Unmatched vendor:</span> "{txn.vendor_name}" was not found in the vendor list.
              {stage === 'accountant' && awaitingThisStage ? (
                <VendorResolvePanel
                  claimId={txn.id}
                  vendorRawText={txn.vendor_name ?? ''}
                  onResolved={() => refetch()}
                />
              ) : (
                <span> The accountant will resolve this.</span>
              )}
            </div>
          )}

          {txn.duplicate_warning && (
            <div className="rounded-xl bg-brand-warningsoft px-4 py-3 text-sm text-brand-text">
              <span className="font-semibold">Duplicate warning:</span> {txn.duplicate_warning.message}
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

        </div>
      </div>
    </div>
  )
}
