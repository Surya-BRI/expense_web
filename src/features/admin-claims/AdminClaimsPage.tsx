import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Pagination } from '../../components/Pagination'
import { SearchInput } from '../../components/SearchInput'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { searchTransactions } from '../../lib/searchTransactions'
import { sortByNewest } from '../../lib/sortByNewest'
import { usePagination } from '../../lib/usePagination'
import { useAdminClaims } from './useAdminClaims'

export function AdminClaimsPage() {
  const { data, isLoading, error } = useAdminClaims()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const sorted = useMemo(
    () => (data ? sortByNewest(searchTransactions(data, search)) : []),
    [data, search],
  )
  const { page, totalPages, pageItems, setPage } = usePagination(sorted, search)

  if (isLoading) return <LoadingSpinner />
  if (error) {
    return <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load claims.'} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">All claims</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">
          {search ? 'No claims match your search.' : 'No claims found.'}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="overflow-hidden rounded-md border border-brand-divider bg-brand-card">
          <table className="w-full text-left">
            <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
              <tr>
                <th className="px-3 py-2">Claim</th>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((txn) => (
                <tr
                  key={txn.id}
                  onClick={() => navigate(`/admin/claims/${txn.id}`)}
                  className="cursor-pointer border-b border-brand-divider last:border-0 hover:bg-brand-lightblue"
                >
                  <td className="px-3 py-3">
                    <span className="font-medium text-brand-darkblue underline underline-offset-2">#{txn.id}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-brand-text">{txn.employee_name}</td>
                  <td className="px-3 py-3 text-sm text-brand-text">{txn.vendor_name ?? '—'}</td>
                  <td className="px-3 py-3 text-sm text-brand-text">{formatMoney(txn.total_amount, txn.currency)}</td>
                  <td className="px-3 py-3 text-sm text-brand-textmuted">
                    {txn.submitted_at ? new Date(txn.submitted_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={txn.status} />
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/claims/${txn.id}`)}
                      className="rounded-md border border-brand-darkblue px-3 py-1 text-xs font-medium text-brand-darkblue hover:bg-brand-lightblue"
                    >
                      View
                    </button>
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
