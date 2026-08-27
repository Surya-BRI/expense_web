import { fetchJson } from './client'
import type { BulkApproveResponse, Transaction } from './types'

export function fetchQueue(stage: string): Promise<Transaction[]> {
  return fetchJson(`/api/approvals/queue?stage=${encodeURIComponent(stage)}`)
}

export function fetchTransaction(id: number): Promise<Transaction> {
  return fetchJson(`/api/approvals/${id}`)
}

function decide(id: number, action: 'approve' | 'dispute' | 'reject', comment?: string): Promise<Transaction> {
  return fetchJson(`/api/approvals/${id}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment ?? null }),
  })
}

export const approve = (id: number, comment?: string) => decide(id, 'approve', comment)
// Backend requires a non-empty comment for dispute/reject (else 400) — enforce in the UI too.
export const dispute = (id: number, comment: string) => decide(id, 'dispute', comment)
export const reject = (id: number, comment: string) => decide(id, 'reject', comment)

export function bulkApprove(transactionIds: number[]): Promise<BulkApproveResponse> {
  return fetchJson('/api/approvals/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ transaction_ids: transactionIds }),
  })
}
