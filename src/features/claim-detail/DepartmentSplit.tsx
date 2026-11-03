import { PiCheckCircleFill, PiClock, PiXCircleFill, PiArrowUUpLeft } from 'react-icons/pi'
import type { HistoryItem, Transaction } from '../../api/types'
import type { DepartmentShare } from './departmentShares'
import { formatMoney } from '../../lib/money'

type Status =
  | { kind: 'approved' | 'disputed' | 'rejected'; by: string | null; at: string | null }
  | { kind: 'waiting' | 'pending' }

/** This round's decision for a stage: entries after the employee's last (re)submission. */
function statusFor(txn: Transaction, stage: string): Status {
  const history: HistoryItem[] = txn.history ?? []
  let start = 0
  history.forEach((h, i) => {
    if (h.action === 'submit' || h.action === 'resubmit' || h.action === 'submitted') start = i + 1
  })
  const entry = [...history.slice(start)].reverse().find((h) => h.stage === stage)
  if (entry) {
    const by = entry.actor_name ?? null
    if (entry.action.startsWith('approve')) return { kind: 'approved', by, at: entry.created_at }
    if (entry.action.startsWith('dispute')) return { kind: 'disputed', by, at: entry.created_at }
    if (entry.action.startsWith('reject')) return { kind: 'rejected', by, at: entry.created_at }
  }
  // Approved claims went through every HOD step (older ones may have no per-stage entry).
  if (txn.status === 'approved' || txn.status === 'paid') return { kind: 'approved', by: null, at: null }
  if (txn.status === 'submitted' && txn.current_stage_key === stage) return { kind: 'waiting' }
  return { kind: 'pending' }
}

function StatusBadge({ status }: { status: Status }) {
  const when = 'at' in status && status.at ? new Date(status.at).toLocaleDateString() : null
  const who = 'by' in status && status.by ? status.by : null
  const detail = [who, when].filter(Boolean).join(' · ')
  switch (status.kind) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-success">
          <PiCheckCircleFill className="h-4 w-4" aria-hidden /> Approved{detail && <span className="font-normal text-brand-textmuted"> · {detail}</span>}
        </span>
      )
    case 'disputed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-orange">
          <PiArrowUUpLeft className="h-4 w-4" aria-hidden /> Disputed{detail && <span className="font-normal text-brand-textmuted"> · {detail}</span>}
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-danger">
          <PiXCircleFill className="h-4 w-4" aria-hidden /> Rejected{detail && <span className="font-normal text-brand-textmuted"> · {detail}</span>}
        </span>
      )
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-darkblue">
          <PiClock className="h-4 w-4" aria-hidden /> Waiting for HOD
        </span>
      )
    default:
      return <span className="text-xs text-brand-textmuted">Not reached yet</span>
  }
}

/**
 * "Department split" card: who owns which part of a shared bill, how much each department's
 * HOD approved, and when. The viewer's own department is highlighted.
 */
export function DepartmentSplit({
  txn,
  shares,
  myDepartmentId,
}: {
  txn: Transaction
  shares: DepartmentShare[]
  myDepartmentId: number | null
}) {
  const total = txn.total_amount ?? txn.amount + txn.vat_amount
  const converted =
    !!txn.base_currency && txn.total_amount_base != null && txn.base_currency.toUpperCase() !== txn.currency.toUpperCase()
  const toBase = (v: number) => (converted && total > 0 ? ((txn.total_amount_base as number) * v) / total : v)

  return (
    <div className="rounded-md border border-brand-divider bg-brand-card p-4">
      <h2 className="text-sm font-bold text-brand-text">Department split</h2>
      <p className="mb-3 text-xs text-brand-textmuted">
        Each department's HOD approves its own items. Shares include VAT, spread by item amount.
      </p>
      <ul className="divide-y divide-brand-divider rounded-md border border-brand-divider">
        {shares.map((s) => {
          const mine = myDepartmentId != null && s.departmentId === myDepartmentId
          return (
            <li
              key={s.stage}
              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5 ${mine ? 'bg-brand-lightblue/60' : ''}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-text">
                  {s.name}
                  {s.departmentId == null && <span className="text-xs font-normal text-brand-textmuted">(employee's department)</span>}
                  {mine && (
                    <span className="rounded-full bg-brand-darkblue px-2 py-0.5 text-[10px] font-bold text-white">Your department</span>
                  )}
                </div>
                <div className="mt-0.5">
                  <span className="text-xs text-brand-textmuted">
                    {s.itemCount} item{s.itemCount === 1 ? '' : 's'} ·{' '}
                  </span>
                  <StatusBadge status={statusFor(txn, s.stage)} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-brand-text">{formatMoney(s.amount, txn.currency)}</div>
                {converted && (
                  <div className="text-xs text-brand-textmuted">{formatMoney(toBase(s.amount), txn.base_currency as string)}</div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
