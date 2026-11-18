import { fetchJson } from './client'
import type { PettyCashFund, ReplenishableBill, TopupRequest } from './adminOrg'
import type { Transaction } from './types'

// Site petty cash for Blue Rhine Contracting (companies with pca_model "site"). Mirrors the
// site* calls in lib/src/api/api_client.dart. Backend: backend/api/routes_site_pca.py +
// services/site_pca_service.py (field names checked against fund_to_dict / _topup_dict).
//
// Each employee holds ONE petty cash for all their sites (an employee-owned fund). Set: the
// Accountant / Head of Accountant / Admin set it, live at once. Top-up: the Accountant prepares
// it from approved bills (submitted) -> Head of Accountant approves (verified) -> Finance
// Manager approves and records the cash withdrawal from the bank (paid).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** fund_service.fund_to_dict for an employee's petty cash (owner_type 'employee'). */
export interface SitePot extends PettyCashFund {
  op_number?: string | null
  op_name?: string | null
  spend_limit?: number | null
}

/** site_pca_service.people row: someone in the company, with their petty cash (0 = not set). */
export interface SitePerson {
  id: number
  display_name: string
  department_name: string | null
  advance: number
}

/** 'topup' (Accountant -> Head of Accountant -> Finance Manager) or 'advance' (a "set" change). */
export type SiteRequestKind = 'topup' | 'advance'

/** submitted | verified | paid | rejected (top-ups); set (amount changes). */
export type SiteRequestStatus = 'submitted' | 'verified' | 'paid' | 'rejected' | 'set' | string

/** fund_service._topup_dict for a site request (list: slim `fund`; one request: full figures). */
export interface SiteRequest extends TopupRequest {
  kind: SiteRequestKind | string
  status: SiteRequestStatus
  employee_id: number | null
  employee_name: string | null
  payment_source?: string | null
  paid_by_name?: string | null
}

/** One bill an employee raised in the company (transaction_service.list_admin row). */
export type SiteBill = Transaction

/** payment_service.PAYMENT_METHODS; the Flutter pay sheet offers these three. */
export type SitePaymentMethod = 'bank_transfer' | 'cash' | 'cheque' | 'payroll'

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Employee petty cash the user may see, by employee name. */
export function fetchSitePots(params: { regionId?: number | null; employeeId?: number | null } = {}): Promise<SitePot[]> {
  const qs = new URLSearchParams()
  if (params.regionId != null) qs.set('region_id', String(params.regionId))
  if (params.employeeId != null) qs.set('employee_id', String(params.employeeId))
  const q = qs.toString()
  return fetchJson(q ? `/api/site-pca/pots?${q}` : '/api/site-pca/pots')
}

/** The company's people with their petty cash (Accounts at every level, Admin). */
export function fetchSitePeople(regionId: number): Promise<SitePerson[]> {
  return fetchJson(`/api/site-pca/people?region_id=${regionId}`)
}

/** Every bill one employee raised in the company (not drafts), newest first. */
export function fetchSiteEmployeeBills(regionId: number, employeeId: number): Promise<SiteBill[]> {
  return fetchJson(`/api/site-pca/employees/${employeeId}/bills?region_id=${regionId}`)
}

/** Approved bills on this petty cash not yet on a top-up. */
export function fetchSiteReplenishableBills(fundId: number): Promise<ReplenishableBill[]> {
  return fetchJson(`/api/site-pca/pots/${fundId}/replenishable-bills`)
}

export function fetchSiteRequests(
  params: { regionId?: number | null; status?: string | null; kind?: SiteRequestKind | null } = {},
): Promise<SiteRequest[]> {
  const qs = new URLSearchParams()
  if (params.regionId != null) qs.set('region_id', String(params.regionId))
  if (params.status) qs.set('status', params.status)
  if (params.kind) qs.set('kind', params.kind)
  const q = qs.toString()
  return fetchJson(q ? `/api/site-pca/requests?${q}` : '/api/site-pca/requests')
}

export function fetchSiteRequest(requestId: number): Promise<SiteRequest> {
  return fetchJson(`/api/site-pca/requests/${requestId}`)
}

// ---------------------------------------------------------------------------
// Set petty cash
// ---------------------------------------------------------------------------

/** Gives an employee petty cash or changes it (`amount` is the new total, not an increase). */
export function setSitePot(body: {
  regionId: number
  employeeId: number
  amount: number
  remarks?: string | null
}): Promise<SiteRequest> {
  return fetchJson('/api/site-pca/pots', {
    method: 'POST',
    body: JSON.stringify({
      region_id: body.regionId,
      employee_id: body.employeeId,
      amount: body.amount,
      remarks: body.remarks ?? null,
    }),
  })
}

// ---------------------------------------------------------------------------
// Top-ups
// ---------------------------------------------------------------------------

/** The Accountant (or Admin) prepares a top-up from approved bills. */
export function requestSiteTopup(fundId: number, transactionIds: number[], remarks?: string | null): Promise<SiteRequest> {
  return fetchJson(`/api/site-pca/pots/${fundId}/topups`, {
    method: 'POST',
    body: JSON.stringify({ transaction_ids: transactionIds, remarks: remarks ?? null }),
  })
}

/** Head of Accountant (or Admin) approves; it goes to the Finance Manager. */
export function approveSiteTopup(requestId: number, remarks?: string | null): Promise<SiteRequest> {
  return fetchJson(`/api/site-pca/requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ remarks: remarks ?? null }),
  })
}

/** Finance Manager (or Admin) approves and records the cash withdrawal from the bank. */
export function paySiteTopup(
  requestId: number,
  body: { method: SitePaymentMethod; reference: string; paymentDate?: string | null; remarks?: string | null },
): Promise<SiteRequest> {
  return fetchJson(`/api/site-pca/requests/${requestId}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      payment_method: body.method,
      payment_reference: body.reference,
      payment_date: body.paymentDate ?? null,
      remarks: body.remarks ?? null,
    }),
  })
}

/** Whoever is at the open step rejects it; the reason is required. */
export function rejectSiteTopup(requestId: number, comment: string): Promise<SiteRequest> {
  return fetchJson(`/api/site-pca/requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  })
}
