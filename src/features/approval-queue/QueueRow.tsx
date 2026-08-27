import { useNavigate } from 'react-router-dom'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import type { Transaction } from '../../api/types'

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
      <td className="px-3 py-3 text-sm text-brand-text">{txn.vendor_name ?? '—'}</td>
      <td className="px-3 py-3 text-sm text-brand-text">{formatMoney(txn.total_amount, txn.currency)}</td>
      <td className="px-3 py-3 text-sm text-brand-textmuted">{new Date(txn.bill_date).toLocaleDateString()}</td>
      <td className="px-3 py-3 text-sm text-brand-textmuted">
        {txn.submitted_at ? new Date(txn.submitted_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-3 py-3">
        <StatusChip status={txn.status} />
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
