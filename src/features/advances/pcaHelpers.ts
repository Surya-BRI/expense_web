import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { RegionConfig } from '../../api/adminOrg'
import {
  fetchAccountsCash,
  fetchPcaAdvances,
  fetchPcaDepartmentEmployees,
  fetchPcaDepartments,
  fetchPcaRequests,
  fetchPcaStaff,
  type PcaFund,
  type PcaRequest,
} from '../../api/pca'
import type { AuthUser, Role } from '../../api/types'
import { useAdminRegions } from '../admin/useAdminQueries'

// Ports of the helpers and providers in lib/src/features/pca/advances_screen.dart and
// accounts_cash_view.dart. Kept out of the .tsx files so those export components only.

export const pcaKeys = {
  all: ['pca'] as const,
  requests: ['pca', 'requests'] as const,
  advances: ['pca', 'advances'] as const,
  departments: (regionId: number) => ['pca', 'departments', regionId] as const,
  departmentEmployees: (regionId: number, departmentId: number) =>
    ['pca', 'department-employees', regionId, departmentId] as const,
  staff: (regionId: number) => ['pca', 'staff', regionId] as const,
  accountsCash: (regionId: number) => ['pca', 'accounts-cash', regionId] as const,
}

/** invalidatePcaProviders(): everything under 'pca', plus the person's own funds. */
export function invalidatePca(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: pcaKeys.all })
  qc.invalidateQueries({ queryKey: ['my-funds'] })
}

export function usePcaRequests() {
  return useQuery({ queryKey: pcaKeys.requests, queryFn: () => fetchPcaRequests() })
}

export function usePcaAdvances() {
  return useQuery({ queryKey: pcaKeys.advances, queryFn: () => fetchPcaAdvances() })
}

export function usePcaDepartments(regionId: number) {
  return useQuery({ queryKey: pcaKeys.departments(regionId), queryFn: () => fetchPcaDepartments(regionId) })
}

export function usePcaDepartmentEmployees(regionId: number, departmentId: number) {
  return useQuery({
    queryKey: pcaKeys.departmentEmployees(regionId, departmentId),
    queryFn: () => fetchPcaDepartmentEmployees(regionId, departmentId),
  })
}

export function usePcaStaff(regionId: number | null) {
  return useQuery({
    queryKey: pcaKeys.staff(regionId ?? 0),
    queryFn: () => fetchPcaStaff(regionId as number),
    enabled: regionId != null,
  })
}

export function useAccountsCash(regionId: number) {
  return useQuery({ queryKey: pcaKeys.accountsCash(regionId), queryFn: () => fetchAccountsCash(regionId) })
}

/** True for a company on the employee-advance model (Professional Signs). */
export function usesEmployeeAdvances(region: Pick<RegionConfig, 'pca_model'>): boolean {
  return region.pca_model === 'employee'
}

/**
 * pcaRegionsProvider: companies that give employee advances, in the usual company order. A
 * non-Admin only gets the companies they cover (the server refuses the others anyway).
 */
export function usePcaRegions(user: AuthUser | null) {
  const regions = useAdminRegions()
  const all = (regions.data ?? []).filter(usesEmployeeAdvances)
  const covered = new Set((user?.allowed_regions ?? []).map((c) => c.trim().toUpperCase()))
  const mine =
    user?.role === 'admin' || covered.size === 0
      ? all
      : all.filter((r) => covered.has((r.region_code ?? '').toUpperCase()))
  return { ...regions, data: regions.data ? (mine.length > 0 ? mine : all) : undefined }
}

/** _CompanyPicker's default: the company signed in under, else the first. */
export function defaultPcaRegionId(regions: RegionConfig[], user: AuthUser | null): number | null {
  if (regions.length === 0) return null
  const current = (user?.region_code ?? '').toUpperCase()
  return (regions.find((r) => (r.region_code ?? '').toUpperCase() === current) ?? regions[0]).id
}

export function isAdvance(r: PcaRequest): boolean {
  return (r.kind || 'topup') === 'advance'
}

export function pcaStatusLabel(r: PcaRequest): string {
  switch (r.status) {
    case 'submitted':
      return isAdvance(r) ? 'Waiting for Accounts Manager' : 'Waiting for HOD'
    case 'hod_approved':
      return 'Waiting for Accounts Manager'
    case 'approved':
    case 'verified':
      return 'Waiting for payment'
    case 'paid':
      return 'Paid'
    case 'set':
      return r.amount < 0 ? 'Amount lowered' : 'Amount set'
    case 'rejected':
      return 'Rejected'
    default:
      return r.status
  }
}

export function pcaStatusColor(r: PcaRequest): string {
  if (r.status === 'paid') return 'text-brand-success'
  if (r.status === 'rejected') return 'text-brand-danger'
  return 'text-brand-orange'
}

export function pcaActionLabel(action: string, advance: boolean): string {
  switch (action) {
    case 'requested':
      return advance ? 'Proposed' : 'Requested'
    case 'hod_approved':
      return 'Approved by HOD'
    case 'approved':
      return 'Approved by Accounts Manager'
    case 'verified':
      return 'Verified by Accounts Manager'
    case 'paid':
      return 'Paid'
    case 'set':
      return 'Petty cash amount set'
    case 'rejected':
      return 'Rejected'
    default:
      return action
  }
}

export interface PcaActions {
  hodApprove: boolean
  managerApprove: boolean
  pay: boolean
}

/**
 * What the signed-in person can do on this request right now (mirrors the backend rules; the
 * server still checks). Only the Accounts Manager (finance_manager) pays in an employee-advance
 * company.
 */
export function pcaActionsFor(r: PcaRequest, role: Role | string | null | undefined): PcaActions {
  const admin = role === 'admin'
  const advance = isAdvance(r)
  const managerStep = (advance && r.status === 'submitted') || (!advance && r.status === 'hod_approved')
  const payStep = (advance && r.status === 'approved') || (!advance && r.status === 'verified')
  return {
    hodApprove: !advance && r.status === 'submitted' && (role === 'hod' || admin),
    managerApprove: managerStep && (role === 'finance_manager' || admin),
    pay: payStep && (role === 'finance_manager' || admin),
  }
}

export function hasPcaAction(a: PcaActions): boolean {
  return a.hodApprove || a.managerApprove || a.pay
}

/** PettyCashFund.projectLabel: "OP-123 Name", the OP code alone, or null. */
export function projectLabel(fund: PcaFund | null | undefined): string | null {
  const op = (fund?.op_number ?? '').trim()
  if (op.length === 0) return null
  const name = (fund?.op_name ?? '').trim()
  return name.length === 0 ? op : `${op} ${name}`
}

/** "d MMM yyyy, HH:mm" in local time, as _when() in advances_screen.dart. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const two = (n: number) => String(n).padStart(2, '0')
  return `${date}, ${two(d.getHours())}:${two(d.getMinutes())}`
}

/** "d MMM yyyy" for a YYYY-MM-DD (or ISO) date. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Local YYYY-MM-DD for today and a year ago: the allowed range of a payment / refill date. */
export function dateRange(): { today: string; yearAgo: string } {
  const iso = (d: Date) => {
    const two = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
  }
  const now = new Date()
  const ago = new Date(now)
  ago.setFullYear(now.getFullYear() - 1)
  return { today: iso(now), yearAgo: iso(ago) }
}

/** double.tryParse(text.replaceAll(',', '')): a finite number, else null. */
export function parseMoney(raw: string): number | null {
  const t = raw.replace(/,/g, '').trim()
  if (t.length === 0) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Share of the limit used, clamped to 0..1 (0 when nothing is set). */
export function usedShare(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(1, Math.max(0, used / limit))
}
