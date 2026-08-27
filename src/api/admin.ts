import { fetchJson } from './client'
import type { Transaction } from './types'

export function fetchAllClaims(): Promise<Transaction[]> {
  return fetchJson('/api/admin/claims')
}

export function fetchClaim(id: number): Promise<Transaction> {
  return fetchJson(`/api/admin/claims/${id}`)
}

export function markPaid(id: number): Promise<Transaction> {
  return fetchJson(`/api/admin/claims/${id}/mark-paid`, { method: 'POST' })
}
