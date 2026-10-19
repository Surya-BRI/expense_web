import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchHistory } from '../../api/approvals'
import { ApiError } from '../../api/client'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { stageLabel } from '../../lib/stageLabels'

const CLAIM_STATUS: Record<string, { label: string; style: string }> = {
  submitted: { label: 'In progress', style: 'bg-brand-lightblue text-brand-darkblue' },
  disputed:  { label: 'Corrected',   style: 'bg-orange-100 text-brand-orange' },
  approved:  { label: 'Approved',    style: 'bg-brand-successsoft text-brand-success' },
  rejected:  { label: 'Rejected',    style: 'bg-red-50 text-brand-danger' },
  paid:      { label: 'Paid',        style: 'bg-brand-successsoft text-brand-success' },
}

function ClaimStatusChip({ status }: { status: string }) {
  const cfg = CLAIM_STATUS[status]
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg?.style ?? 'bg-gray-100 text-brand-textmuted'}`}>
      {cfg?.label ?? status}
    </span>
  )
}

const ACTION_LABEL: Record<string, string> = {
  approve: 'Approved',
  reject: 'Rejected',
  dispute: 'Disputed',
}

const ACTION_COLOR: Record<string, string> = {
  approve: 'text-green-700 bg-green-50',
  reject: 'text-red-700 bg-red-50',
  dispute: 'text-amber-700 bg-amber-50',
}

export function HistoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['approval-history'],
    queryFn: () => fetchHistory(100),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-text">My Approval History</h1>

      {isLoading && <LoadingSpinner />}
      {error && (
        <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load history.'} />
      )}

      {!isLoading && !error && data?.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">No claims actioned yet.</p>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-hidden rounded-md border border-brand-divider bg-brand-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
              <tr>
                <th className="px-3 py-2">Claim</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Comment</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((txn) => (
                <tr key={txn.id} className="border-t border-brand-divider hover:bg-brand-background">
                  <td className="px-3 py-2">
                    <Link
                      to={`/queue/${txn.my_action_stage}/${txn.id}`}
                      className="font-medium text-brand-darkblue hover:underline"
                    >
                      #{txn.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-brand-text">{txn.employee_name}</td>
                  <td className="px-3 py-2 text-brand-text">{txn.vendor_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-brand-text">
                    {formatMoney(txn.total_amount ?? txn.amount + txn.vat_amount, txn.currency)}
                  </td>
                  <td className="px-3 py-2 text-brand-textmuted">{stageLabel(txn.my_action_stage)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_COLOR[txn.my_action] ?? ''}`}>
                      {ACTION_LABEL[txn.my_action] ?? txn.my_action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-brand-textmuted">
                    {txn.my_actioned_at ? new Date(txn.my_actioned_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-brand-textmuted">{txn.my_comment ?? '—'}</td>
                  <td className="px-3 py-2">
                    <ClaimStatusChip status={txn.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
