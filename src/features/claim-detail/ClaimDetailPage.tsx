import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PiWallet } from 'react-icons/pi'
import { Link, useParams } from 'react-router-dom'
import { fetchBillFunds } from '../../api/funds'
import { ApiError } from '../../api/client'
import type { LineItem, Transaction } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { stageLabel } from '../../lib/stageLabels'
import { RecordPaymentDialog } from '../payments/PaymentsPage'
import { DecisionActions } from './DecisionActions'
import { departmentShares } from './departmentShares'
import { DepartmentSplit } from './DepartmentSplit'
import { HistoryTimeline } from './HistoryTimeline'
import { ReceiptViewer } from './ReceiptViewer'
import { useClaimDetail } from './useClaimDetail'

function LineItemsTable({
  items,
  currency,
  vatAmount,
  total,
  highlightDepartmentId,
}: {
  items: LineItem[]
  currency: string
  vatAmount: number
  total: number
  /** The reviewing department HOD's lines are highlighted (and the rest dimmed). */
  highlightDepartmentId?: number | null
}) {
  const showDept = items.some((li) => li.owning_department_name)
  const cols = showDept ? 6 : 5
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-brand-divider text-sm">
      <table className="w-full text-left">
        <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Category</th>
            {showDept && <th className="px-3 py-2">Department</th>}
            <th className="px-3 py-2">OP</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((li) => {
            const mine = highlightDepartmentId != null && li.owning_department_id === highlightDepartmentId
            const dim = highlightDepartmentId != null && !mine
            return (
              <tr
                key={li.id}
                className={`border-t border-brand-divider ${mine ? 'bg-brand-lightblue/60' : ''} ${dim ? 'opacity-50' : ''}`}
              >
                <td className="px-3 py-2 text-brand-textmuted">{li.line_no}</td>
                <td className="px-3 py-2 text-brand-text">
                  {li.description}
                  {li.quantity != null && <span className="text-brand-textmuted"> × {li.quantity}</span>}
                </td>
                <td className="px-3 py-2 text-brand-textmuted">{li.category_name ?? '—'}</td>
                {showDept && (
                  <td className="px-3 py-2">
                    {li.owning_department_name ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-brand-orange">
                        {li.owning_department_name}
                      </span>
                    ) : (
                      <span className="text-brand-textmuted">Own</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-brand-textmuted">{li.op_number ?? '—'}</td>
                <td className="px-3 py-2 text-right text-brand-text">{formatMoney(li.amount, currency)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t border-brand-divider bg-brand-background text-xs">
          <tr>
            <td colSpan={cols - 1} className="px-3 py-2 text-right text-brand-textmuted">VAT</td>
            <td className="px-3 py-2 text-right text-brand-textmuted">{formatMoney(vatAmount, currency)}</td>
          </tr>
          <tr>
            <td colSpan={cols - 1} className="px-3 py-2 text-right font-semibold text-brand-text">Total</td>
            <td className="px-3 py-2 text-right font-semibold text-brand-text">{formatMoney(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-semibold text-brand-text' : 'text-brand-textmuted'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">{label}</dt>
      <dd className={`mt-0.5 text-brand-text ${strong ? 'font-medium' : ''}`}>{value}</dd>
    </div>
  )
}

/**
 * The petty-cash pots this bill is paid from (one per paying department) and how much of the
 * bill each pays. GET /api/approvals/:id/funds -- the Finance Manager gets every pot, to check
 * the bill fits before final approval; an HOD gets only their own department's pot.
 */
function BillFundsPanel({ txn }: { txn: Transaction }) {
  const { data: rows } = useQuery({
    queryKey: ['bill-funds', txn.id],
    queryFn: () => fetchBillFunds(txn.id),
  })
  if (!rows || rows.length === 0) return null
  const region = (txn.region_code ?? '').toUpperCase()
  return (
    <div className="space-y-3 rounded-md border border-brand-divider bg-brand-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-brand-darkblue">
        <PiWallet className="h-4 w-4" aria-hidden />
        Petty cash this bill is paid from · {region}
      </div>
      {rows.map(({ fund, bill_part }) => {
        const money = (v: number | undefined) => formatMoney(v ?? 0, fund.currency)
        const available = fund.available ?? 0
        const figures: [string, number | undefined][] = [
          ['Available now', fund.available],
          ['Approved limit', fund.approved_limit],
          ['Spent', fund.spent],
          ['Pending top-up', fund.pending_topup],
        ]
        return (
          <div key={fund.id} className="rounded-md border border-brand-divider p-3">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-brand-text">
                {(fund.department_name ?? 'Department').trim()} petty cash
              </span>
              <span className="text-sm text-brand-textmuted">
                This bill: <span className="font-bold text-brand-text">{money(bill_part)}</span>
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {figures.map(([label, value]) => (
                <div key={label} className="rounded-md bg-brand-background px-3 py-2">
                  <dt className="text-xs text-brand-textmuted">{label}</dt>
                  <dd
                    className={`text-sm font-bold ${
                      label === 'Available now' && (value ?? 0) < 0 ? 'text-brand-danger' : 'text-brand-text'
                    }`}
                  >
                    {money(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {available < 0 && (
              <p className="mt-2 text-xs font-semibold text-brand-danger">
                This pot is overdrawn by {money(-available)}.
              </p>
            )}
          </div>
        )
      })}
      <p className="text-xs text-brand-textmuted">
        Bills awaiting approval (this one included) are already reserved in "Available now".
      </p>
    </div>
  )
}

export function ClaimDetailPage() {
  const { stage = '', id } = useParams<{ stage: string; id: string }>()
  const claimId = Number(id)
  const { user } = useAuth()
  const { data: txn, isLoading, error, refetch } = useClaimDetail(claimId)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showFullBill, setShowFullBill] = useState(false)
  const [paying, setPaying] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load claim.'} />
  }
  if (!txn) return null

  // Same rules as the Flutter review screen (approval_detail_screen.dart).
  const awaitingThisStage = txn.status === 'submitted' && txn.current_stage === stage
  const withEmployee = txn.status === 'disputed'
  // Petty cash is settled from the fund at final approval -- only reimbursements get paid.
  const awaitingPayment = txn.status === 'approved' && txn.type !== 'petty_cash' && !txn.payment
  const canRecordPayment = awaitingPayment && (user?.role === 'finance_manager' || user?.role === 'admin')
  const total = txn.total_amount ?? txn.amount + txn.vat_amount

  // At a department HOD step (e.g. IT HOD on a Sales bill) the reviewer approves only the
  // lines their department owns.
  const stageKey = txn.current_stage_key ?? ''
  const reviewDeptId =
    awaitingThisStage && stage === 'department_hod' && stageKey.includes(':') ? Number(stageKey.split(':').pop()) : null
  const deptLines = reviewDeptId == null ? [] : txn.line_items.filter((l) => l.owning_department_id === reviewDeptId)
  const linesTotal = txn.line_items.reduce((s, l) => s + l.amount, 0)
  const deptPart =
    deptLines.length === 0 || linesTotal <= 0 ? null : (total * deptLines.reduce((s, l) => s + l.amount, 0)) / linesTotal
  const deptName = deptLines[0]?.owning_department_name ?? null
  const onlyDeptLines = deptPart != null && !showFullBill
  const shownLines = onlyDeptLines ? deptLines : txn.line_items

  // The same bill in the company's base currency (what petty cash is debited / paid in).
  const converted =
    !!txn.base_currency &&
    txn.total_amount_base != null &&
    txn.base_currency.toUpperCase() !== txn.currency.toUpperCase()
  const toBase = (v: number) => (converted && total > 0 ? ((txn.total_amount_base as number) * v) / total : v)
  const baseCurrency = converted ? (txn.base_currency as string) : txn.currency

  const lastReturn = [...(txn.history ?? [])].reverse().find((h) => h.action === 'dispute' || h.action === 'disputed')
  const currentStageText =
    (txn.current_stage_key && txn.stage_labels?.[txn.current_stage_key]) || stageLabel(txn.current_stage)
  // Shared bill: each department's part and whether its HOD approved it.
  const shares = departmentShares(txn)
  const myDeptId = user?.role === 'hod' ? (user.department_id ?? null) : null
  // Petty cash: the pots this bill comes out of (FM: all of them; HOD: their own).
  const showFundPanel =
    (user?.role === 'hod' || user?.role === 'finance_manager') &&
    txn.type === 'petty_cash' &&
    txn.status !== 'rejected'

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
                <HistoryTimeline history={txn.history} stageLabels={txn.stage_labels} />
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
                  <span className="rounded-full bg-brand-lightblue px-2 py-0.5 text-xs font-medium text-brand-darkblue">
                    {txn.type === 'petty_cash' ? 'Petty cash' : 'Reimbursement'}
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
              <>
                <LineItemsTable
                  items={shownLines}
                  currency={txn.currency}
                  vatAmount={txn.vat_amount}
                  total={total}
                  highlightDepartmentId={deptPart != null && showFullBill ? reviewDeptId : null}
                />
                {deptPart != null && (
                  <button
                    type="button"
                    onClick={() => setShowFullBill((v) => !v)}
                    className="mt-2 text-sm font-medium text-brand-darkblue hover:underline"
                  >
                    {showFullBill ? "Show only your department's items" : `Show full bill (${txn.line_items.length} items)`}
                  </button>
                )}
              </>
            ) : (
              <div className="mt-4 space-y-1 text-sm">
                <Row label="Amount excl. VAT" value={formatMoney(txn.amount, txn.currency)} />
                <Row label="VAT" value={formatMoney(txn.vat_amount, txn.currency)} />
                <div className="mt-2 border-t border-brand-divider pt-2">
                  <Row label="Total" value={formatMoney(total, txn.currency)} strong={deptPart == null} />
                </div>
              </div>
            )}

            {(converted || deptPart != null) && (
              <div className="mt-3 space-y-1 border-t border-brand-divider pt-3 text-sm">
                {converted && <Row label={`Total in ${baseCurrency}`} value={formatMoney(toBase(total), baseCurrency)} />}
                {deptPart != null && (
                  <>
                    <div className="flex justify-between rounded-md bg-brand-lightblue px-2 py-1.5 font-bold text-brand-darkblue">
                      <span>Your part ({deptName ?? 'department'})</span>
                      <span>{formatMoney(deptPart, txn.currency)}</span>
                    </div>
                    {converted && <Row label={`In ${baseCurrency}`} value={formatMoney(toBase(deptPart), baseCurrency)} />}
                  </>
                )}
              </div>
            )}
          </div>

          {shares.length > 1 && <DepartmentSplit txn={txn} shares={shares} myDepartmentId={myDeptId} />}

          {showFundPanel && <BillFundsPanel txn={txn} />}

          <div className="rounded-md border border-brand-divider bg-brand-card p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
              <Detail label="Invoice no." value={txn.bill_number?.trim() || '—'} />
              <Detail label="Employee" value={txn.employee_name} strong />
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
              <Detail label="Bill currency" value={txn.currency} />
              {converted && txn.exchange_rate > 0 && (
                <Detail label="Exchange rate" value={`1 ${txn.currency} = ${txn.exchange_rate} ${baseCurrency}`} />
              )}
              <Detail label="Category" value={txn.category_name ?? '—'} />
              <Detail label="Bill date" value={txn.bill_date ? new Date(txn.bill_date).toLocaleDateString() : '—'} />
              {txn.submitted_at && <Detail label="Submitted" value={new Date(txn.submitted_at).toLocaleString()} />}
              <Detail label="Current stage" value={currentStageText} strong />
              {txn.op_number && <Detail label="OP number" value={txn.op_number} />}
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-textmuted">Remarks</dt>
                <dd className="mt-0.5 text-brand-text">{txn.remarks?.trim() || '—'}</dd>
              </div>
            </dl>
          </div>

          {txn.duplicate_warning && (
            <div className="rounded-xl bg-brand-warningsoft px-4 py-3 text-sm text-brand-text">
              <span className="font-semibold">Duplicate warning:</span> {txn.duplicate_warning.message}
            </div>
          )}

          {withEmployee ? (
            <div className="rounded-xl bg-brand-warningsoft px-4 py-3 text-sm text-brand-text">
              Sent back to the employee{lastReturn?.remarks?.trim() ? `: ${lastReturn.remarks.trim()}` : ''}. Approve and
              Reject return after they correct and resubmit.
            </div>
          ) : (
            !awaitingThisStage &&
            !awaitingPayment && (
              <div className="rounded-xl bg-brand-warningsoft px-4 py-3 text-sm text-brand-text">
                This claim is not currently awaiting your action.
              </div>
            )
          )}

          {awaitingThisStage && (
            <DecisionActions
              claimId={txn.id}
              stage={stage}
              departmentName={deptPart != null ? deptName : null}
              duplicateNeedsJustification={stage === 'accountant' && !!txn.duplicate_warning}
              onDecided={() => refetch()}
            />
          )}

          {txn.payment && (
            <div className="rounded-md border border-brand-divider bg-brand-card p-4">
              <h2 className="mb-3 text-sm font-bold text-brand-text">Payment</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <Detail label="Amount paid" value={formatMoney(txn.payment.amount, txn.payment.currency)} strong />
                <Detail label="Method" value={txn.payment.payment_method_label ?? txn.payment.payment_method} />
                <Detail label="Reference" value={txn.payment.payment_reference} />
                <Detail
                  label="Paid on"
                  value={txn.payment.payment_date ? new Date(txn.payment.payment_date).toLocaleDateString() : '—'}
                />
                {txn.payment.paid_by_name && <Detail label="Recorded by" value={txn.payment.paid_by_name} />}
                {txn.payment.remarks && <Detail label="Remarks" value={txn.payment.remarks} />}
              </dl>
            </div>
          )}

          {canRecordPayment && (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="w-full rounded-md bg-brand-success px-3 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              Record payment
            </button>
          )}
        </div>
      </div>

      {paying && (
        <RecordPaymentDialog
          claim={txn}
          onClose={() => setPaying(false)}
          onSaved={() => {
            setPaying(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
