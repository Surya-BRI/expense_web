import type { Transaction } from '../../api/types'

export interface DepartmentShare {
  /** null = the employee's own department (approved at the 'hod' stage). */
  departmentId: number | null
  name: string
  /** The approval stage key for this part: 'hod' or 'department_hod:<id>'. */
  stage: string
  itemCount: number
  /** Share of the bill total (VAT spread pro rata), in the bill currency. */
  amount: number
}

/**
 * How a multi-department bill splits: each department's items, its share of the total
 * (VAT spread pro rata, as the mobile app's "Your part") and the HOD stage that approves it.
 * Empty for a bill that belongs to one department only.
 */
export function departmentShares(txn: Transaction): DepartmentShare[] {
  const lines = txn.line_items
  if (!lines.some((l) => l.owning_department_id != null)) return []
  const total = txn.total_amount ?? txn.amount + txn.vat_amount
  const linesTotal = lines.reduce((s, l) => s + l.amount, 0)
  if (linesTotal <= 0) return []
  const ownName = (txn.stage_labels?.hod ?? '').replace(/\s*HOD$/, '').trim() || "Employee's department"
  const groups = new Map<string, DepartmentShare>()
  for (const l of lines) {
    const id = l.owning_department_id ?? null
    const key = id == null ? 'own' : String(id)
    const g = groups.get(key) ?? {
      departmentId: id,
      name: id == null ? ownName : (l.owning_department_name ?? 'Department'),
      stage: id == null ? 'hod' : `department_hod:${id}`,
      itemCount: 0,
      amount: 0,
    }
    g.itemCount += 1
    g.amount += (total * l.amount) / linesTotal
    groups.set(key, g)
  }
  // Employee's own department first, then the others in bill order.
  return [...groups.values()].sort((a, b) => (a.departmentId == null ? -1 : b.departmentId == null ? 1 : 0))
}
