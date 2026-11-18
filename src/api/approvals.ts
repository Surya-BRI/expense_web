import { fetchJson } from './client'
import type { BulkApproveResponse, HistoryTransaction, Transaction } from './types'

export function fetchQueue(stage: string): Promise<Transaction[]> {
  return fetchJson(`/api/approvals/queue?stage=${encodeURIComponent(stage)}`)
}

export function fetchTransaction(id: number): Promise<Transaction> {
  return fetchJson(`/api/approvals/${id}`)
}

/** Expense journal booked at the company's journal step (Professional Signs' Accounts Manager). */
export interface Journal {
  /** EJV, or EJVB for a multi-branch transaction. */
  journal_type: string
  /** The journal's number in ERP. */
  journal_reference: string
}

function decide(
  id: number,
  action: 'approve' | 'dispute' | 'reject',
  comment?: string,
  journal?: Journal | null,
): Promise<Transaction> {
  return fetchJson(`/api/approvals/${id}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment ?? null, ...(journal ?? {}) }),
  })
}

export const approve = (id: number, comment?: string, journal?: Journal | null) =>
  decide(id, 'approve', comment, journal)
// Backend requires a non-empty comment for dispute/reject (else 400) — enforce in the UI too.
export const dispute = (id: number, comment: string) => decide(id, 'dispute', comment)
export const reject = (id: number, comment: string) => decide(id, 'reject', comment)

export function bulkApprove(transactionIds: number[]): Promise<BulkApproveResponse> {
  return fetchJson('/api/approvals/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ transaction_ids: transactionIds }),
  })
}

export function fetchHistory(limit = 100): Promise<HistoryTransaction[]> {
  return fetchJson(`/api/approvals/history?limit=${limit}`)
}
