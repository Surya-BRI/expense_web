import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchCoveredDepartmentFunds } from '../../api/funds'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { RegionLogo } from '../../components/RegionLogo'
import { SearchInput } from '../../components/SearchInput'
import { formatMoney } from '../../lib/money'
import { companyLabel } from '../../lib/regionFilter'
import { companyTitle, errorMessage } from '../admin/adminHelpers'
import { useAdminRegions } from '../admin/useAdminQueries'

/**
 * Finance Manager: read-only view of every department's petty-cash pot in the companies they
 * cover (limit, available, spent, pending top-up). Limits are set by Admin; top-ups stay
 * HOD request -> Accounts verify -> Finance approve (on the Top-ups page).
 */
export function DepartmentFundsPage() {
  const { user } = useAuth()
  const regions = useAdminRegions()

  // Only the companies this person covers (home + Admin-ticked), as for their queue.
  const covered = useMemo(() => {
    const codes = new Set((user?.allowed_regions ?? []).map((c) => c.toUpperCase()))
    if (user?.region_code) codes.add(user.region_code.toUpperCase())
    return (regions.data ?? []).filter((r) => codes.has(r.region_code.toUpperCase()))
  }, [regions.data, user])

  const [picked, setPicked] = useState<number | null>(null)
  // Default: the company signed in under, else the first covered one.
  const current =
    covered.find((r) => r.id === picked) ??
    covered.find((r) => r.region_code.toUpperCase() === (user?.region_code ?? '').toUpperCase()) ??
    covered[0] ??
    null

  const funds = useQuery({
    queryKey: ['department-funds', current?.id],
    queryFn: () => fetchCoveredDepartmentFunds(current!.id),
    enabled: current != null,
  })
  const [search, setSearch] = useState('')
  const rows = (funds.data ?? []).filter(
    (r) => !search.trim() || r.department_name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  // Company totals, per currency (all pots of one company share its base currency).
  const totals = rows.reduce(
    (acc, r) => {
      if (!r.fund) return acc
      acc.currency = r.fund.currency
      acc.limit += r.fund.approved_limit
      acc.available += r.fund.available ?? 0
      acc.spent += r.fund.spent ?? 0
      acc.pending += r.fund.pending_topup ?? 0
      return acc
    },
    { currency: '', limit: 0, available: 0, spent: 0, pending: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">Department funds</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Search department" />
      </div>

      {regions.isLoading && <LoadingSpinner />}
      {regions.error && <ErrorBanner message={errorMessage(regions.error, 'Failed to load companies.')} />}

      {covered.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {covered.map((r) => {
            const active = r.id === current?.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setPicked(r.id)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-1.5 text-sm font-semibold ${
                  active ? 'border-brand-darkblue text-brand-darkblue' : 'border-brand-divider text-brand-textmuted hover:border-brand-darkblue/50'
                }`}
              >
                <RegionLogo code={r.region_code} className="h-6 w-16" />
                {companyLabel(r.region_code)}
              </button>
            )
          })}
        </div>
      )}

      {current && (
        <p className="text-sm text-brand-textmuted">
          {companyTitle(current)} · limits are set by Admin; top-ups are approved on the Top-ups page.
        </p>
      )}

      {funds.isLoading && <LoadingSpinner />}
      {funds.error && <ErrorBanner message={errorMessage(funds.error, 'Failed to load department funds.')} />}

      {totals.currency && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['Available', totals.available],
              ['Approved limits', totals.limit],
              ['Spent', totals.spent],
              ['Pending top-up', totals.pending],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-brand-divider bg-brand-card px-4 py-3">
              <div className="text-xs text-brand-textmuted">{label}</div>
              <div className="text-lg font-extrabold text-brand-darkblue">{formatMoney(value, totals.currency)}</div>
            </div>
          ))}
        </div>
      )}

      {funds.data && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">No departments for this company</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-brand-divider bg-brand-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
              <tr>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2 text-right">Available</th>
                <th className="px-3 py-2 text-right">Approved limit</th>
                <th className="px-3 py-2 text-right">Spent</th>
                <th className="px-3 py-2 text-right">Pending top-up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const f = row.fund
                const available = f?.available ?? 0
                const pending = f?.pending_topup ?? 0
                return (
                  <tr key={row.department_id} className="border-t border-brand-divider">
                    <td className="px-3 py-2.5 font-bold text-brand-text">
                      {row.department_name}
                      {!f && (
                        <span className="ml-2 rounded-md bg-brand-warningsoft px-2 py-0.5 text-[11px] font-bold text-brand-orange">
                          No limit set
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-extrabold ${available < 0 ? 'text-brand-danger' : 'text-brand-darkblue'}`}
                    >
                      {f ? formatMoney(available, f.currency) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">{f ? formatMoney(f.approved_limit, f.currency) : '—'}</td>
                    <td className="px-3 py-2.5 text-right">{f ? formatMoney(f.spent ?? 0, f.currency) : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {f ? (
                        <span className={pending > 0 ? 'rounded bg-brand-warningsoft px-1.5 py-0.5 font-semibold' : ''}>
                          {formatMoney(pending, f.currency)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
