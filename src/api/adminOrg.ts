import { ApiError, fetchJson } from './client'

// Admin "organisation" endpoints: companies (regions), people, department petty-cash funds
// and top-ups. Mirrors lib/src/api/api_client.dart in the Flutter app. Field names were
// checked against backend/services/config_service.py and backend/services/fund_service.py.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** config_service.region_to_dict (logo_url rewritten by routes_org._region_with_logo). */
export interface RegionConfig {
  id: number
  region_code: string
  region_name: string
  company_name: string | null
  logo_url: string | null
  base_currency: string | null
  allocation_model?: string | null
  brand_color?: string | null
  petty_cash_hard_limit_enabled?: boolean
  is_active?: boolean
}

/** One approver row from GET /api/admin/config/regions/:id/approvers. */
export interface RegionApprover {
  id: number
  display_name: string
  department_name: string | null
  /** True = this is their own (ERP) company; false = Admin ticked it under People. */
  home_region: boolean
}

export type ApproverRole = 'hod' | 'accountant' | 'finance_manager'

export interface RegionApprovers {
  region_id: number
  region_code: string
  roles: Record<ApproverRole, RegionApprover[]>
  /** Roles with nobody (only accountant / finance_manager are reported); those fall back to Admin. */
  missing: ApproverRole[]
}

/** config_service.department_to_dict. */
export interface AdminDepartment {
  id: number
  name: string
  is_active: boolean
}

/** config_service._erp_employee_to_dict / user_to_dict. */
export interface OrgUser {
  id: number
  display_name: string
  employee_id?: number | null
  username: string | null
  email: string | null
  role: string | null
  erp_role: string | null
  department_id: number | null
  department_name: string | null
  home_region_code: string | null
  region_codes: string[]
  has_app_login: boolean
}

export interface OrgUserPage {
  items: OrgUser[]
  total: number
  limit: number
  offset: number
}

/**
 * fund_service.fund_to_dict. In GET /api/topups the embedded `fund` is the slimmer
 * `_fund_identity` (no balance figures), so those are optional.
 */
export interface PettyCashFund {
  id: number
  region_id: number | null
  region_code: string | null
  region_name: string | null
  company_name: string | null
  owner_type: string
  department_id: number | null
  department_name: string | null
  employee_id: number | null
  employee_name: string | null
  currency: string
  approved_limit: number
  opening_balance?: number
  credited?: number
  replenished?: number
  spent?: number
  unreplenished_spend?: number
  pending_topup?: number
  pending_bills?: number
  remaining?: number
  available?: number
  uncommitted?: number
  label: string | null
  is_active: boolean
}

/** fund_service.list_department_funds row. */
export interface DepartmentFund {
  department_id: number
  department_name: string
  fund: PettyCashFund | null
}

/** fund_service.list_replenishable_bills row. */
export interface ReplenishableBill {
  id: number
  /** This fund's part of the bill (e.g. only the IT lines on a Sales bill). */
  amount: number
  bill_total: number | null
  bill_date: string | null
  currency: string | null
  employee_id: number | null
}

export type TopupStatus = 'submitted' | 'verified' | 'approved' | 'rejected' | 'returned' | string

export interface TopupHistoryEntry {
  action: 'requested' | 'verified' | 'returned' | 'approved' | 'rejected' | string
  actor_name: string | null
  comment: string | null
  at: string | null
}

/** fund_service._topup_dict. */
export interface TopupRequest {
  id: number
  fund_id: number
  amount: number
  status: TopupStatus
  remarks: string | null
  requester_id: number | null
  requester_name: string | null
  verified_by: number | null
  verified_by_name: string | null
  verified_on: string | null
  decided_by: number | null
  decided_by_name: string | null
  decided_on: string | null
  payment_method: string | null
  payment_reference: string | null
  payment_date: string | null
  transaction_ids: number[]
  created_on: string | null
  department_name: string | null
  region_code: string | null
  /** Audit trail, oldest first. */
  history: TopupHistoryEntry[]
  fund: PettyCashFund | null
}

// ---------------------------------------------------------------------------
// Companies (regions)
// ---------------------------------------------------------------------------

/** GET /api/regions (active only), falling back to the admin config list on 404. "IN" is hidden. */
export async function listRegions(): Promise<RegionConfig[]> {
  let rows: RegionConfig[]
  try {
    rows = await fetchJson<RegionConfig[]>('/api/regions')
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err
    rows = await fetchJson<RegionConfig[]>('/api/admin/config/regions')
  }
  return (rows ?? []).filter((r) => (r.region_code ?? '').toUpperCase() !== 'IN')
}

export function updateRegion(regionId: number, body: { company_name?: string }): Promise<RegionConfig> {
  return fetchJson(`/api/admin/config/regions/${regionId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function fetchRegionApprovers(regionId: number): Promise<RegionApprovers> {
  return fetchJson(`/api/admin/config/regions/${regionId}/approvers`)
}

export function fetchAdminDepartments(): Promise<AdminDepartment[]> {
  return fetchJson('/api/admin/config/departments')
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/**
 * With a region_code the backend pages the ERP employee directory for that company
 * (including people who never signed in). Without one it pages app users only.
 * Backend caps `limit` at 100.
 */
export function fetchAdminUsers(params: {
  regionCode?: string | null
  q?: string | null
  limit?: number
  offset?: number
}): Promise<OrgUserPage> {
  const qs = new URLSearchParams()
  if (params.regionCode) qs.set('region_code', params.regionCode)
  if (params.q && params.q.trim()) qs.set('q', params.q.trim())
  qs.set('limit', String(params.limit ?? 25))
  qs.set('offset', String(params.offset ?? 0))
  return fetchJson(`/api/admin/users?${qs.toString()}`)
}

export function fetchAdminUser(userId: number): Promise<OrgUser> {
  return fetchJson(`/api/admin/users/${userId}`)
}

/** Replaces the Admin-ticked companies. Empty list clears all extras. */
export function setUserRegions(userId: number, regionCodes: string[]): Promise<OrgUser> {
  return fetchJson(`/api/admin/users/${userId}/regions`, {
    method: 'PUT',
    body: JSON.stringify({ region_codes: regionCodes }),
  })
}

// ---------------------------------------------------------------------------
// Petty-cash funds
// ---------------------------------------------------------------------------

export function fetchAdminFunds(): Promise<PettyCashFund[]> {
  return fetchJson('/api/admin/funds')
}

export function fetchDepartmentFunds(regionId: number): Promise<DepartmentFund[]> {
  return fetchJson(`/api/admin/department-funds?region_id=${regionId}`)
}

export interface CreateFundBody {
  region_id: number
  owner_type: 'department' | 'employee'
  opening_balance: number
  currency: string
  department_id?: number | null
  employee_id?: number | null
}

export function createFund(body: CreateFundBody): Promise<PettyCashFund> {
  return fetchJson('/api/admin/funds', { method: 'POST', body: JSON.stringify(body) })
}

/** Changes the approved limit (opening balance). */
export function updateFundOpening(fundId: number, openingBalance: number): Promise<PettyCashFund> {
  return fetchJson(`/api/admin/funds/${fundId}`, {
    method: 'PUT',
    body: JSON.stringify({ opening_balance: openingBalance }),
  })
}

export function creditFund(fundId: number, amount: number, remarks?: string | null): Promise<PettyCashFund> {
  return fetchJson(`/api/admin/funds/${fundId}/credit`, {
    method: 'POST',
    body: JSON.stringify({ amount, remarks: remarks ?? null }),
  })
}

export function fetchMyFunds(): Promise<PettyCashFund[]> {
  return fetchJson('/api/funds/mine')
}

// ---------------------------------------------------------------------------
// Top-ups
// ---------------------------------------------------------------------------

export function fetchTopups(status?: string): Promise<TopupRequest[]> {
  return fetchJson(status ? `/api/topups?status=${encodeURIComponent(status)}` : '/api/topups')
}

export function fetchReplenishableBills(fundId: number): Promise<ReplenishableBill[]> {
  return fetchJson(`/api/funds/${fundId}/replenishable-bills`)
}

export function createTopup(
  fundId: number,
  body: { amount?: number | null; remarks?: string | null; transaction_ids?: number[] | null },
): Promise<TopupRequest> {
  return fetchJson(`/api/funds/${fundId}/topups`, {
    method: 'POST',
    body: JSON.stringify({
      amount: body.amount ?? null,
      remarks: body.remarks ?? null,
      transaction_ids: body.transaction_ids ?? null,
    }),
  })
}

export function verifyTopup(id: number, remarks?: string | null): Promise<TopupRequest> {
  return fetchJson(`/api/topups/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ remarks: remarks ?? null }),
  })
}

/** Accounts sends a top-up back to the HOD; the reason is required. */
export function returnTopup(id: number, remarks: string): Promise<TopupRequest> {
  return fetchJson(`/api/topups/${id}/return`, {
    method: 'POST',
    body: JSON.stringify({ remarks }),
  })
}

export function decideTopup(
  id: number,
  opts: { approve: boolean; remarks?: string | null; paymentReference?: string | null },
): Promise<TopupRequest> {
  const body: Record<string, unknown> = { remarks: opts.remarks ?? null }
  if (opts.approve) body.payment_method = 'bank_transfer'
  if (opts.paymentReference != null) body.payment_reference = opts.paymentReference
  return fetchJson(`/api/topups/${id}/${opts.approve ? 'approve' : 'reject'}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
