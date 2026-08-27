import type { Transaction } from '../api/types'

// Newest first, by submitted_at (falls back to created_at for drafts that were
// never submitted, which shouldn't normally reach an approver queue anyway).
export function sortByNewest(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const aDate = a.submitted_at ?? a.created_at
    const bDate = b.submitted_at ?? b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}
