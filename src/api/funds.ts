import type { DepartmentFund, PettyCashFund } from './adminOrg'
import { fetchJson } from './client'

/** One pot a petty-cash bill is paid from, and how much of the bill it pays (pot currency). */
export interface BillFund {
  bill_part: number
  fund: PettyCashFund
}

/**
 * GET /api/approvals/:id/funds -- the pots this bill draws on (one per paying department),
 * for any approver covering the bill's company. Empty for a reimbursement.
 */
export function fetchBillFunds(transactionId: number): Promise<BillFund[]> {
  return fetchJson(`/api/approvals/${transactionId}/funds`)
}

/** GET /api/funds/department-funds -- every department's pot in one company (Accounts / Finance, read-only). */
export function fetchCoveredDepartmentFunds(regionId: number): Promise<DepartmentFund[]> {
  return fetchJson(`/api/funds/department-funds?region_id=${regionId}`)
}
