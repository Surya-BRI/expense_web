import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { createTopup, fetchReplenishableBills, type PettyCashFund, type RegionConfig } from '../../api/adminOrg'
import { useAuth } from '../../auth/useAuth'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { baseCurrencyForRegion, errorMessage, fundCompanyLabel } from './adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from './AdminUi'
import { adminKeys, invalidateFunds, useDepartmentFunds } from './useAdminQueries'

/**
 * Admin path of RaiseTopupScreen (topups_screen.dart): Admin raises a top-up on a
 * department's behalf (HOD away, or no HOD). Opened from a company page, so the company
 * is fixed and only departments with a set-up fund are offered.
 *
 * HOD path: opened from one of their fund cards with `fund`, so that fund is fixed and
 * nothing else is loaded (RaiseTopupScreen's `widget.fund`).
 */
export function RaiseTopupDialog({
  region,
  fund: fixedFund,
  onClose,
}: {
  region?: RegionConfig
  fund?: PettyCashFund
  onClose: () => void
}) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const {
    data: rows,
    isLoading: loadingRows,
    error: fundsError,
  } = useDepartmentFunds(region?.id ?? 0, !fixedFund && region != null)
  const loadingFunds = !fixedFund && loadingRows

  const funds = useMemo<PettyCashFund[]>(
    () =>
      fixedFund
        ? [fixedFund]
        : (rows ?? []).flatMap((r) => (r.fund && r.fund.owner_type === 'department' ? [r.fund] : [])),
    [rows, fixedFund],
  )

  // _defaultFund: the admin's own department in this company, else the first.
  const defaultFundId = useMemo(() => {
    if (funds.length === 0) return null
    const deptId = user?.department_id
    return (deptId != null ? funds.find((f) => f.department_id === deptId) : undefined)?.id ?? funds[0].id
  }, [funds, user])

  const [pickedFundId, setPickedFundId] = useState<number | null>(null)
  const fundId = pickedFundId ?? defaultFundId
  const fund = funds.find((f) => f.id === fundId) ?? null
  const currency = fund?.currency ?? (region ? baseCurrencyForRegion(region) : '')

  const bills = useQuery({
    queryKey: adminKeys.replenishableBills(fundId),
    queryFn: () => fetchReplenishableBills(fundId as number),
    enabled: fundId != null,
  })

  // Every bill is ticked by default; `unticked` holds the ones the admin cleared.
  const [unticked, setUnticked] = useState<Set<number>>(new Set())
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const billList = bills.data ?? []
  const selected = billList.filter((b) => !unticked.has(b.id))
  const amount = selected.reduce((sum, b) => sum + b.amount, 0)

  const submit = useMutation({
    mutationFn: () =>
      createTopup(fundId as number, {
        remarks: remarks.trim() ? remarks.trim() : null,
        transaction_ids: selected.map((b) => b.id),
      }),
    onSuccess: () => {
      invalidateFunds(qc)
      onClose()
    },
  })

  function save() {
    if (fundId == null) {
      setFormError('Pick a department')
      return
    }
    if (selected.length === 0) {
      setFormError('Pick the petty-cash bills to replenish')
      return
    }
    setFormError(null)
    submit.mutate()
  }

  function toggle(id: number, on: boolean) {
    setUnticked((prev) => {
      const next = new Set(prev)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const error = formError ?? (submit.error ? errorMessage(submit.error) : null) ?? (bills.error ? errorMessage(bills.error) : null)

  return (
    <Modal title="Request top-up" onClose={onClose} wide>
      {loadingFunds ? (
        <LoadingSpinner label="Loading petty-cash bills…" />
      ) : !fixedFund && fundsError ? (
        <p className="text-sm text-brand-danger">{errorMessage(fundsError)}</p>
      ) : funds.length === 0 ? (
        <p className="text-sm leading-snug text-brand-textmuted">
          No department pot is set up for this company yet. Set an approved limit under Departments first.
        </p>
      ) : (
        <div className="space-y-4">
          {funds.length <= 1 ? (
            <div>
              <div className="text-xs font-medium text-brand-textmuted">Department</div>
              <div className="text-base font-bold text-brand-text">{fund ? fundCompanyLabel(fund) : 'Department'}</div>
            </div>
          ) : (
            <label className="block text-sm font-medium text-brand-text">
              Department
              <select
                value={fundId ?? ''}
                onChange={(e) => {
                  setPickedFundId(Number(e.target.value))
                  setUnticked(new Set())
                  setFormError(null)
                }}
                className={`${inputClass} mt-1`}
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {fundCompanyLabel(f)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="text-base font-extrabold text-brand-text">Amount&nbsp;&nbsp;{formatMoney(amount, currency)}</div>

          {bills.isLoading ? (
            <LoadingSpinner label="Loading petty-cash bills…" />
          ) : billList.length === 0 ? (
            <p className="text-sm text-brand-textmuted">No unreplenished petty-cash bills for this department.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-brand-divider overflow-y-auto rounded-md border border-brand-divider">
              {billList.map((bill) => {
                const billCurrency = bill.currency ?? currency
                const partOf = bill.bill_total != null && Math.abs(bill.bill_total - bill.amount) > 0.004
                const detail = [
                  bill.bill_date || null,
                  `#${bill.id}`,
                  partOf ? `your department's part of ${formatMoney(bill.bill_total as number, billCurrency)}` : null,
                ]
                  .filter((s): s is string => !!s)
                  .join(' · ')
                return (
                  <li key={bill.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-brand-background">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!unticked.has(bill.id)}
                        onChange={(e) => toggle(bill.id, e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-brand-text">
                          {formatMoney(bill.amount, billCurrency)}
                        </span>
                        <span className="block text-xs text-brand-textmuted">{detail}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          <label className="block text-sm font-medium text-brand-text">
            Reason (optional)
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`${inputClass} mt-1`} />
          </label>

          {error && <p className="text-sm text-brand-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <OutlineButton onClick={onClose}>Cancel</OutlineButton>
            <PrimaryButton disabled={submit.isPending || bills.isFetching} onClick={save}>
              {submit.isPending ? 'Sending…' : 'Submit request'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
