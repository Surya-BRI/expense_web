import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { createFund, updateFundOpening, type DepartmentFund, type RegionConfig } from '../../api/adminOrg'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { SearchInput } from '../../components/SearchInput'
import { formatMoney } from '../../lib/money'
import { baseCurrencyForRegion, errorMessage } from './adminHelpers'
import { OutlineButton, PrimaryButton } from './AdminUi'
import { LimitAmountDialog } from './LimitAmountDialog'
import { adminKeys, invalidateFunds, useDepartmentFunds } from './useAdminQueries'

type Editing = { mode: 'setup' | 'change'; row: DepartmentFund }

/** "Departments" tab of admin_company_screen.dart: department petty-cash limits. */
export function DepartmentsTab({ region }: { region: RegionConfig }) {
  const { data: rows, isLoading, error } = useDepartmentFunds(region.id)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const qc = useQueryClient()
  const companyCurrency = baseCurrencyForRegion(region)

  const save = useMutation({
    mutationFn: async ({ mode, row, amount }: Editing & { amount: number }) => {
      if (mode === 'setup') {
        return createFund({
          region_id: region.id,
          owner_type: 'department',
          department_id: row.department_id,
          opening_balance: amount,
          currency: companyCurrency,
        })
      }
      if (!row.fund) throw new Error('This department has no fund yet')
      return updateFundOpening(row.fund.id, amount)
    },
    onSuccess: () => {
      setEditing(null)
      invalidateFunds(qc)
      qc.invalidateQueries({ queryKey: adminKeys.regions })
    },
  })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rows ?? []).filter((r) => q.length === 0 || r.department_name.toLowerCase().includes(q))
  }, [rows, search])

  function open(next: Editing) {
    save.reset()
    setEditing(next)
  }

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search department" />

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load departments.')} />}

      {rows && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">No departments for this company</p>
      )}

      {visible.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-brand-divider bg-brand-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
              <tr>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Available</th>
                <th className="px-3 py-2 text-right">Approved limit</th>
                <th className="px-3 py-2 text-right">Spent</th>
                <th className="px-3 py-2 text-right">Pending top-up</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const fund = row.fund
                const pending = fund?.pending_topup ?? 0
                return (
                  <tr key={row.department_id} className="border-t border-brand-divider">
                    <td className="px-3 py-2.5 font-bold text-brand-text">{row.department_name}</td>
                    <td className="px-3 py-2.5">
                      {fund ? (
                        <span className="rounded-md bg-brand-successsoft px-2 py-0.5 text-[11px] font-bold text-brand-success">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-md bg-brand-warningsoft px-2 py-0.5 text-[11px] font-bold text-brand-orange">
                          Not set up
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-brand-darkblue">
                      {fund ? formatMoney(fund.available ?? 0, fund.currency) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {fund ? formatMoney(fund.approved_limit, fund.currency) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fund ? formatMoney(fund.spent ?? 0, fund.currency) : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {fund ? (
                        <span className={pending > 0 ? 'rounded bg-brand-warningsoft px-1.5 py-0.5 font-semibold' : ''}>
                          {formatMoney(pending, fund.currency)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {fund ? (
                        <OutlineButton onClick={() => open({ mode: 'change', row })}>Change limit</OutlineButton>
                      ) : (
                        <PrimaryButton onClick={() => open({ mode: 'setup', row })}>Set up limit</PrimaryButton>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <LimitAmountDialog
          title={
            editing.mode === 'setup'
              ? `Set up ${editing.row.department_name}`
              : `Change ${editing.row.department_name} limit`
          }
          confirmLabel="Save limit"
          currency={editing.mode === 'setup' ? companyCurrency : (editing.row.fund?.currency ?? companyCurrency)}
          initial={editing.mode === 'change' ? editing.row.fund?.approved_limit : null}
          busy={save.isPending}
          serverError={save.error ? errorMessage(save.error) : null}
          onConfirm={(amount) => save.mutate({ ...editing, amount })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
