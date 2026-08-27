import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Pagination } from '../../components/Pagination'
import { SearchInput } from '../../components/SearchInput'
import { ApiError } from '../../api/client'
import { landingPathFor } from '../../routing/roleLanding'
import { BulkApproveBar } from './BulkApproveBar'
import { QueueRow } from './QueueRow'
import { QueueSkeleton } from './QueueSkeleton'
import { StatusFilterChips, type StatusFilter } from './StatusFilterChips'
import { useApprovalQueue } from './useApprovalQueue'
import { sortByNewest } from '../../lib/sortByNewest'
import { searchTransactions } from '../../lib/searchTransactions'
import { usePagination } from '../../lib/usePagination'

export function ApprovalQueuePage() {
  const { stage = '' } = useParams<{ stage: string }>()
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data, isLoading, error } = useApprovalQueue(stage)

  const filtered = useMemo(() => {
    if (!data) return []
    const byStatus = statusFilter === 'all' ? data : data.filter((t) => t.status === statusFilter)
    return sortByNewest(searchTransactions(byStatus, search))
  }, [data, statusFilter, search])

  const { page, totalPages, pageItems, setPage } = usePagination(filtered, `${statusFilter}|${search}`)

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // Defensive frontend guard: the backend's stage query isn't confirmed to reject
  // a mismatched role/stage combination, so redirect here rather than assume.
  if (user && stage !== landingPathFor(user.role).split('/').pop()) {
    return <Navigate to={landingPathFor(user.role)} replace />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold capitalize text-brand-text">{stage} queue</h1>
          <SearchInput value={search} onChange={setSearch} />
        </div>
        <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
      </div>

      <BulkApproveBar stage={stage} selectedIds={selectedIds} onCleared={() => setSelectedIds([])} />

      {isLoading && <QueueSkeleton />}
      {error && (
        <ErrorBanner message={error instanceof ApiError ? error.message : 'Failed to load queue.'} />
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">
          {search ? 'No claims match your search.' : 'No claims in this queue.'}
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <>
          <div className="flex items-center justify-end">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
          <div className="overflow-hidden rounded-md border border-brand-divider bg-brand-card">
            <table className="w-full text-left">
              <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2">Claim</th>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Bill date</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((txn) => (
                  <QueueRow
                    key={txn.id}
                    txn={txn}
                    stage={stage}
                    selected={selectedIds.includes(txn.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
