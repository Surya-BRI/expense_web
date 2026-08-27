import type { Transaction } from '../api/types'

// Client-side search across the fields most useful for finding a claim quickly.
export function searchTransactions(transactions: Transaction[], query: string): Transaction[] {
  const q = query.trim().toLowerCase()
  if (!q) return transactions

  return transactions.filter((t) => {
    const haystack = [
      String(t.id),
      t.employee_name,
      t.vendor_name,
      t.category_name,
      t.op_number,
      t.region_code,
      t.remarks,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
}
