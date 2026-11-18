import { fetchJson } from './client'
import type { Transaction } from './types'

export function fetchAllClaims(): Promise<Transaction[]> {
  return fetchJson('/api/admin/claims')
}

export function fetchClaim(id: number): Promise<Transaction> {
  return fetchJson(`/api/admin/claims/${id}`)
}

// Paying a claim goes through POST /api/payments (api/payments.ts recordPayment), with the
// method / reference / date Spec 5.5 asks for -- not the old one-click /mark-paid route.
