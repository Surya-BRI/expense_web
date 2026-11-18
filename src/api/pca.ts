import { fetchJson } from './client'
import type { PettyCashFund, TopupHistoryEntry } from './adminOrg'

// Professional Signs (KSA, pca_model "employee"): each employee's petty cash advance (PCA) and
// the Accounts Department's own petty cash. Mirrors the /api/pca calls in the Flutter app's
// lib/src/api/api_client.dart. Field names checked against backend/api/routes_pca.py,
// services/employee_pca_service.py, services/accounts_cash_service.py and
// services/fund_service.py (fund_to_dict, _fund_identity, _topup_dict).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** fund_to_dict / _fund_identity for an employee advance (adds the project and spend limit). */
export interface PcaFund extends PettyCashFund {
  op_number?: string | null
  op_name?: string | null
  /** Employee advance with a hard limit (Professional Signs: 50% of the PCA); null = none. */
  spend_limit?: number | null
}

/** advance = a change to the employee's PCA amount; topup = a refill with approved bills. */
export type PcaRequestKind = 'advance' | 'topup'

/**
 * submitted | hod_approved | approved | verified | paid | rejected, or `set` (an advance row
 * logging a change to the PCA amount, live at once).
 */
export type PcaRequestStatus =
  | 'set'
  | 'submitted'
  | 'hod_approved'
  | 'approved'
  | 'verified'
  | 'paid'
  | 'rejected'
  | string

/** fund_service._topup_dict for an employee advance request (list: the slim `fund`). */
export interface PcaRequest {
  id: number
  fund_id: number
  kind: PcaRequestKind | string
  /** For `set` rows: the change (negative when the amount was lowered). */
  amount: number
  status: PcaRequestStatus
  hod_approved_by_name: string | null
  hod_approved_on: string | null
  /** bank | accounts_petty_cash */
  payment_source: string | null
  paid_by_name: string | null
  employee_id: number | null
  employee_name: string | null
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
  /** Audit trail, oldest first. Actions: requested | set | hod_approved | approved | verified | paid | rejected. */
  history: TopupHistoryEntry[]
  fund: PcaFund | null
}

/** employee_pca_service.staff row: someone this HOD / Admin may set petty cash for. */
export interface PcaStaff {
  id: number
  display_name: string
  department_name: string | null
  /** Current petty cash amount; 0 = not set. */
  advance: number
}

/** One row of employee_pca_service.departments. */
export interface PcaDepartment {
  /** 0 = people with no department. */
  department_id: number
  department_name: string
  employee_count: number
  with_petty_cash: number
  total_limit: number
  not_set: number
}

export interface PcaDepartments {
  region_id: number
  region_code: string
  company_name: string
  currency: string
  departments: PcaDepartment[]
}

/** The money figures on an employee row (summary and department employees). */
export interface PcaFigures {
  advance: number
  /** Proposed / approved under the old flow, not paid yet. */
  advance_waiting: number
  spent: number
  unreplenished_spend: number
  pending_bills: number
  pending_topup: number
  available: number
}

/** One employee of employee_pca_service.department_employees (all 0 when not set). */
export interface PcaMember extends PcaFigures {
  fund_id: number | null
  employee_id: number
  employee_name: string | null
}

export interface PcaDepartmentEmployees {
  region_id: number
  currency: string
  department_id: number
  department_name: string
  employees: PcaMember[]
}

/** employee_pca_service.summary totals (also each department / project group). */
export interface PcaTotals extends PcaFigures {
  employee_count: number
  advance_count: number
}

export interface PcaSummaryEmployee extends PcaFigures {
  fund_id: number | null
  employee_id: number
  employee_name: string | null
  department_name: string | null
}

export interface PcaSummaryDepartment extends PcaTotals {
  department_id: number | null
  department_name: string | null
  employees: PcaSummaryEmployee[]
}

export interface PcaSummaryProjectEmployee {
  employee_id: number
  employee_name: string | null
  department_name: string | null
  spent: number
  pending_bills: number
}

export interface PcaSummaryProject extends PcaTotals {
  op_number: string | null
  op_name: string | null
  employees: PcaSummaryProjectEmployee[]
}

export interface PcaSummary {
  region_id: number
  region_code: string
  company_name: string
  currency: string
  totals: PcaTotals & { project_count: number }
  by_department: PcaSummaryDepartment[]
  by_project: PcaSummaryProject[]
}

/** accounts_cash_service._entry_dict. kind: payout | refill | set. */
export interface AccountsCashEntry {
  id: number
  kind: 'payout' | 'refill' | 'set' | string
  /** For `set`: the change (negative when lowered). */
  amount: number
  transaction_id: number | null
  topup_id: number | null
  /** Who the money went to, for a payout of a bill. */
  employee_name: string | null
  reference: string | null
  /** YYYY-MM-DD */
  date: string | null
  remarks: string | null
  actor_name: string | null
  recorded_at: string | null
}

/** accounts_cash_service.view. */
export interface AccountsCash {
  region_id: number
  region_code: string
  company_name: string
  currency: string
  /** Admin, or the company's Accounts Manager. */
  can_set: boolean
  /** Admin, or the company's payer roles (Accounts Manager). */
  can_refill: boolean
  configured: boolean
  limit: number
  paid_out: number
  refilled: number
  to_refill: number
  available: number
  low: boolean
  /** Most recent first (last 30). */
  entries: AccountsCashEntry[]
}

/** routes_pca.PayRequest.payment_source, labelled as the Flutter pay sheet (kPaymentSources). */
export const PCA_PAYMENT_SOURCES: Record<string, string> = {
  bank: 'Cash withdrawal from bank',
  accounts_petty_cash: 'Direct payment by Accounts Department',
}

// ---------------------------------------------------------------------------
// Advances and requests
// ---------------------------------------------------------------------------

function regionQuery(regionId: number): string {
  return `region_id=${encodeURIComponent(String(regionId))}`
}

/**
 * Advances with balances: an employee's own, an HOD's staff's, everyone's for Accounts, the
 * Accounts Manager and Admin (companies they cover).
 */
export function fetchPcaAdvances(regionId?: number | null): Promise<PcaFund[]> {
  return fetchJson(regionId != null ? `/api/pca/advances?${regionQuery(regionId)}` : '/api/pca/advances')
}

/** Employees tab: departments with counts only (fast). */
export function fetchPcaDepartments(regionId: number): Promise<PcaDepartments> {
  return fetchJson(`/api/pca/departments?${regionQuery(regionId)}`)
}

/** One department's employees with their petty cash figures (0 = no department). */
export function fetchPcaDepartmentEmployees(regionId: number, departmentId: number): Promise<PcaDepartmentEmployees> {
  return fetchJson(`/api/pca/departments/${departmentId}/employees?${regionQuery(regionId)}`)
}

/** Who this HOD (their department staff, not themselves) or Admin (anyone) can set petty cash for. */
export function fetchPcaStaff(regionId: number): Promise<PcaStaff[]> {
  return fetchJson(`/api/pca/staff?${regionQuery(regionId)}`)
}

/** Report: advances by department, and petty-cash spend by project (OP code). */
export function fetchPcaSummary(regionId: number): Promise<PcaSummary> {
  return fetchJson(`/api/pca/summary?${regionQuery(regionId)}`)
}

/** Advance / top-up requests this user may see, newest first. */
export function fetchPcaRequests(params: { status?: string | null; kind?: PcaRequestKind | null } = {}): Promise<PcaRequest[]> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.kind) qs.set('kind', params.kind)
  const q = qs.toString()
  return fetchJson(q ? `/api/pca/requests?${q}` : '/api/pca/requests')
}

/**
 * HOD (their staff) or Admin sets an employee's petty cash amount: the new total, not an
 * increase. Live at once (logged as an advance request with status `set`).
 */
export function setPcaAdvance(body: {
  region_id: number
  employee_id: number
  amount: number
  remarks?: string | null
}): Promise<PcaRequest> {
  return fetchJson('/api/pca/advances', {
    method: 'POST',
    body: JSON.stringify({ ...body, remarks: body.remarks ?? null }),
  })
}

/** One step of an advance / top-up: HOD approval, Accounts Manager approval / verification, or reject. */
export type PcaStep = 'hod-approve' | 'manager-approve' | 'reject'

/** `reject` needs the reason in `remarks` (the server refuses an empty one). */
export function pcaStep(requestId: number, step: PcaStep, remarks?: string | null): Promise<PcaRequest> {
  return fetchJson(`/api/pca/requests/${requestId}/${step}`, {
    method: 'POST',
    body: JSON.stringify({ remarks: remarks ?? null }),
  })
}

/** Accounts Manager (or Admin) records how an approved advance / verified top-up was paid. */
export function payPcaRequest(
  requestId: number,
  body: {
    payment_source: string
    payment_method: string
    payment_reference: string
    /** YYYY-MM-DD; defaults to today on the server. */
    payment_date: string
    remarks?: string | null
  },
): Promise<PcaRequest> {
  return fetchJson(`/api/pca/requests/${requestId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ ...body, remarks: body.remarks ?? null }),
  })
}

// ---------------------------------------------------------------------------
// Accounts Department petty cash (PCA PDF section 6)
// ---------------------------------------------------------------------------

/** Accounts Manager, Accounts and Admin. */
export function fetchAccountsCash(regionId: number): Promise<AccountsCash> {
  return fetchJson(`/api/pca/accounts-cash?${regionQuery(regionId)}`)
}

/** Admin or the Accounts Manager: the account's amount from now on (not an increase). */
export function setAccountsCash(regionId: number, amount: number, remarks?: string | null): Promise<AccountsCash> {
  return fetchJson('/api/pca/accounts-cash', {
    method: 'PUT',
    body: JSON.stringify({ region_id: regionId, amount, remarks: remarks ?? null }),
  })
}

/** Accounts Manager / Admin: money put back from the bank (`amount` null = all paid out). */
export function refillAccountsCash(
  regionId: number,
  body: { amount?: number | null; reference: string; refill_date: string; remarks?: string | null },
): Promise<AccountsCash> {
  return fetchJson('/api/pca/accounts-cash/refills', {
    method: 'POST',
    body: JSON.stringify({
      region_id: regionId,
      amount: body.amount ?? null,
      reference: body.reference,
      refill_date: body.refill_date,
      remarks: body.remarks ?? null,
    }),
  })
}
