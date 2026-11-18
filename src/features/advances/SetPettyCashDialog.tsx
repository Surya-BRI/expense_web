import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { RegionConfig } from '../../api/adminOrg'
import { setPcaAdvance, type PcaStaff } from '../../api/pca'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { baseCurrencyForRegion, errorMessage } from '../admin/adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from '../admin/AdminUi'
import { invalidatePca, parseMoney, usePcaStaff } from './pcaHelpers'

/**
 * Port of ProposeAdvanceScreen (advances_screen.dart): the HOD (their staff) or Admin (anyone in
 * the company) sets an employee's petty cash (PCA) amount, one per employee for all their
 * projects. Live at once: no approval or payment. Setting again changes it.
 */
export function SetPettyCashDialog({
  region,
  initialEmployeeId,
  onClose,
}: {
  region: RegionConfig
  /** Opened from an employee in the Employees list: that person is preselected. */
  initialEmployeeId?: number | null
  onClose: () => void
}) {
  const staff = usePcaStaff(region.id)
  return (
    <Modal title="Set petty cash" onClose={onClose}>
      {staff.isLoading ? (
        <LoadingSpinner />
      ) : staff.error ? (
        <>
          <p className="text-sm text-brand-danger">{errorMessage(staff.error)}</p>
          <div className="mt-4 flex justify-end">
            <OutlineButton onClick={onClose}>Close</OutlineButton>
          </div>
        </>
      ) : (
        <SetPettyCashForm region={region} staff={staff.data ?? []} initialEmployeeId={initialEmployeeId} onClose={onClose} />
      )}
    </Modal>
  )
}

function amountText(person: PcaStaff | undefined): string {
  const current = person?.advance ?? 0
  return current > 0 ? current.toFixed(2) : ''
}

function SetPettyCashForm({
  region,
  staff,
  initialEmployeeId,
  onClose,
}: {
  region: RegionConfig
  staff: PcaStaff[]
  initialEmployeeId?: number | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const currency = baseCurrencyForRegion(region)
  const initial = staff.find((s) => s.id === initialEmployeeId)
  const [employeeId, setEmployeeId] = useState<number | null>(initial?.id ?? null)
  // Picking someone fills in their current amount (empty when not set yet).
  const [amount, setAmount] = useState(() => amountText(initial))
  const [remarks, setRemarks] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  // Department only when the list spans more than one.
  const multiDepartment = new Set(staff.map((s) => s.department_name)).size > 1

  const save = useMutation({
    mutationFn: (value: number) =>
      setPcaAdvance({
        region_id: region.id,
        employee_id: employeeId as number,
        amount: value,
        remarks: remarks.trim() ? remarks.trim() : null,
      }),
    onSuccess: () => {
      invalidatePca(qc)
      onClose()
    },
  })

  function pick(id: number | null) {
    setEmployeeId(id)
    setAmount(amountText(staff.find((s) => s.id === id)))
  }

  function submit() {
    const value = parseMoney(amount)
    const problem =
      employeeId == null ? 'Pick the employee' : value == null || value < 0 ? 'Enter the petty cash amount' : null
    if (problem) {
      setFormError(problem)
      return
    }
    setFormError(null)
    save.mutate(value as number)
  }

  const error = formError ?? (save.error ? errorMessage(save.error) : null)
  const busy = save.isPending

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-brand-text">
        Employee *
        <select
          value={employeeId ?? ''}
          disabled={busy}
          onChange={(e) => pick(e.target.value === '' ? null : Number(e.target.value))}
          className={`${inputClass} mt-1`}
        >
          <option value="">Pick the employee</option>
          {staff.map((s) => {
            const name = [s.display_name, multiDepartment && s.department_name ? s.department_name : null]
              .filter((p): p is string => !!p)
              .join(' · ')
            return (
              <option key={s.id} value={s.id}>
                {`${name} — ${s.advance > 0 ? formatMoney(s.advance, currency) : 'Not set'}`}
              </option>
            )
          })}
        </select>
      </label>
      {staff.length === 0 && <p className="text-xs text-brand-textmuted">Nobody you can set petty cash for.</p>}
      <label className="block text-sm font-medium text-brand-text">
        Petty cash amount *
        <div className="relative mt-1">
          <input
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} pr-14`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-brand-textmuted">
            {currency}
          </span>
        </div>
      </label>
      <label className="block text-sm font-medium text-brand-text">
        Why this amount (optional)
        <textarea
          rows={2}
          value={remarks}
          disabled={busy}
          onChange={(e) => setRemarks(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      </label>
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <OutlineButton onClick={onClose}>Cancel</OutlineButton>
        <PrimaryButton disabled={busy} onClick={submit}>
          {busy ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
    </div>
  )
}
