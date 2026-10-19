import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../../lib/money'
import type { Transaction } from '../../api/types'

const QUEUE_STATUS: Record<string, { label: string; style: string }> = {
  submitted: { label: 'Needs review', style: 'bg-brand-lightblue text-brand-darkblue' },
  disputed:  { label: 'Corrected',    style: 'bg-orange-100 text-brand-orange' },
}

export function QueueRow({
  txn,
  stage,
  selected,
  onToggleSelect,
}: {
  txn: Transaction
  stage: string
  selected: boolean
  onToggleSelect: (id: number) => void
}) {
  const navigate = useNavigate()
  const detailPath = `/queue/${stage}/${txn.id}`

  return (
    <tr
      onClick={() => navigate(detailPath)}
      className="cursor-pointer border-b border-brand-divider last:border-0 hover:bg-brand-lightblue"
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(txn.id)}
          aria-label={`Select claim ${txn.id}`}
        />
      </td>
      <td className="px-3 py-3">
        <span className="font-medium text-brand-darkblue underline underline-offset-2">#{txn.id}</span>
      </td>
      <td className="px-3 py-3 text-sm text-brand-text">{txn.employee_name}</td>
      <td className="px-3 py-3">
        {txn.region_code && (
          <span className="rounded-full bg-brand-background px-2 py-0.5 text-xs font-medium text-brand-textmuted">
            {txn.region_code}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-brand-text">{txn.vendor_name ?? '—'}</td>
      <td className="px-3 py-3 text-sm text-brand-text">{formatMoney(txn.total_amount, txn.currency)}</td>
      <td className="px-3 py-3 text-sm text-brand-textmuted">{new Date(txn.bill_date).toLocaleDateString()}</td>
      <td className="px-3 py-3 text-sm text-brand-textmuted">
        {txn.submitted_at ? new Date(txn.submitted_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-3 py-3">
        {(() => {
          const s = QUEUE_STATUS[txn.status]
          return (
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s?.style ?? 'bg-gray-100 text-brand-textmuted'}`}>
              {s?.label ?? txn.status}
            </span>
          )
        })()}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {txn.duplicate_flag && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-brand-orange">
              Duplicate
            </span>
          )}
          {txn.vendor_unmatched && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Vendor
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => navigate(detailPath)}
          className="rounded-md border border-brand-darkblue px-3 py-1 text-xs font-medium text-brand-darkblue hover:bg-brand-lightblue"
        >
          View
        </button>
      </td>
    </tr>
  )
}
