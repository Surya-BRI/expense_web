import { useQuery, type QueryClient } from '@tanstack/react-query'
import type { RegionConfig } from '../../api/adminOrg'
import {
  fetchSiteEmployeeBills,
  fetchSitePeople,
  fetchSitePots,
  fetchSiteRequests,
  type SiteBill,
  type SitePot,
  type SiteRequest,
} from '../../api/sitePca'
import { isApproverRole, type AuthUser } from '../../api/types'

// Rules and small helpers for the BRC site petty cash screens (port of the top-level helpers in
// lib/src/features/pca/site_pca_screen.dart). Kept out of the .tsx files so those export
// components only. Who may do what is decided by the backend; these only decide which buttons
// to show, exactly as the Flutter screen does.

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const siteKeys = {
  all: ['site-pca'] as const,
  pots: (regionId: number) => ['site-pca', 'pots', regionId] as const,
  people: (regionId: number) => ['site-pca', 'people', regionId] as const,
  topups: (regionId: number) => ['site-pca', 'requests', regionId, 'topup'] as const,
  sets: (regionId: number) => ['site-pca', 'requests', regionId, 'advance'] as const,
  bills: (regionId: number, employeeId: number) => ['site-pca', 'bills', regionId, employeeId] as const,
  replenishable: (fundId: number) => ['site-pca', 'replenishable', fundId] as const,
}

export function useSitePots(regionId: number) {
  return useQuery({ queryKey: siteKeys.pots(regionId), queryFn: () => fetchSitePots({ regionId }) })
}

export function useSitePeople(regionId: number, enabled = true) {
  return useQuery({ queryKey: siteKeys.people(regionId), queryFn: () => fetchSitePeople(regionId), enabled })
}

export function useSiteTopups(regionId: number) {
  return useQuery({
    queryKey: siteKeys.topups(regionId),
    queryFn: () => fetchSiteRequests({ regionId, kind: 'topup' }),
  })
}

/** Petty cash amount changes ("set"), for an employee's history. */
export function useSiteSets(regionId: number) {
  return useQuery({
    queryKey: siteKeys.sets(regionId),
    queryFn: () => fetchSiteRequests({ regionId, kind: 'advance' }),
  })
}

export function useSiteEmployeeBills(regionId: number, employeeId: number) {
  return useQuery({
    queryKey: siteKeys.bills(regionId, employeeId),
    queryFn: () => fetchSiteEmployeeBills(regionId, employeeId),
  })
}

/** _refreshAll in the Flutter screen: every site petty cash list, plus the menu's own funds. */
export function invalidateSitePca(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: siteKeys.all })
  qc.invalidateQueries({ queryKey: ['my-funds'] })
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** Sets / changes petty cash: Accountant, Head of Accountant, Admin. */
export function canSetPettyCash(role: string | null | undefined): boolean {
  return role === 'accountant' || role === 'head_accountant' || role === 'admin'
}

/** Prepares a top-up: Accountant, Admin (the Head of Accountant approves it). */
export function canPrepareTopup(role: string | null | undefined): boolean {
  return role === 'accountant' || role === 'admin'
}

export type SiteTopupAction = 'approve' | 'pay' | 'reject'

/** _actionsFor: the steps this role can take on a top-up now. */
export function topupActionsFor(request: SiteRequest, role: string | null | undefined): SiteTopupAction[] {
  const admin = role === 'admin'
  if (request.status === 'submitted' && (role === 'head_accountant' || admin)) return ['approve', 'reject']
  if (request.status === 'verified' && (role === 'finance_manager' || admin)) return ['pay', 'reject']
  return []
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export function usesSitePots(region: Pick<RegionConfig, 'pca_model'>): boolean {
  return (region.pca_model ?? '') === 'site'
}

/** sitePcaRegionProvider: the site-model company the user is signed in under, else the first. */
export function pickSiteRegion(regions: RegionConfig[], user: AuthUser | null): RegionConfig | null {
  const sites = regions.filter(usesSitePots)
  const code = (user?.region_code ?? '').toUpperCase()
  return sites.find((r) => r.region_code.toUpperCase() === code) ?? sites[0] ?? null
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

/** Share of the amount still available, 0..1. */
export function leftShare(pot: SitePot): number {
  const limit = pot.approved_limit
  if (!(limit > 0)) return 0
  return Math.min(1, Math.max(0, (pot.available ?? 0) / limit))
}

/** Red under 20 %, orange under 50 %, else green: [text class, bar class]. */
export function shareColor(share: number): { text: string; bar: string } {
  if (share < 0.2) return { text: 'text-brand-danger', bar: 'bg-brand-danger' }
  if (share < 0.5) return { text: 'text-brand-orange', bar: 'bg-brand-orange' }
  return { text: 'text-brand-success', bar: 'bg-brand-success' }
}

/** Approved bills not yet topped up and not already on a top-up in progress. */
export function amountToTopUp(pot: SitePot): number {
  return Math.max(0, (pot.spent ?? 0) - (pot.credited ?? 0)) - (pot.pending_topup ?? 0)
}

/** Treat anything under half a fils as zero, as the Flutter `> 0.004` checks. */
export function isPositive(amount: number): boolean {
  return amount > 0.004
}

/** "Amount" text field: commas allowed, a number >= 0, else null. */
export function parseMoneyInput(raw: string): number | null {
  const t = raw.replace(/,/g, '').trim()
  if (t.length === 0) return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// ---------------------------------------------------------------------------
// Top-ups
// ---------------------------------------------------------------------------

export function siteStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'With Head of Accountant'
    case 'verified':
      return 'With Finance Manager'
    case 'paid':
      return 'Paid · pot refilled'
    case 'rejected':
      return 'Rejected'
    default:
      return status
  }
}

export function siteStatusStyle(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-brand-successsoft text-brand-success'
    case 'rejected':
      return 'bg-red-50 text-brand-danger'
    default:
      return 'bg-brand-warningsoft text-brand-orange'
  }
}

/** Short date for top-up history ("3 Nov"), as DateFormat('d MMM'). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "d MMM yyyy, h:mm a", as the petty cash changes timeline. */
export function longDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date}, ${time}`
}

/** Today as YYYY-MM-DD in local time (the pay form's date). */
export function todayYmd(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/** Request's employee, from the request or its fund. */
export function requestEmployeeId(r: SiteRequest): number | null {
  return r.employee_id ?? r.fund?.employee_id ?? null
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

export function billTitle(b: SiteBill): string {
  if ((b.vendor_name ?? '').trim()) return b.vendor_name as string
  if ((b.category_name ?? '').trim()) return b.category_name as string
  return `Bill #${b.id}`
}

export function billDetails(b: SiteBill): string {
  return [b.bill_date || null, b.op_number || null, b.type === 'petty_cash' ? 'Petty cash' : 'Reimbursement']
    .filter((s): s is string => !!s)
    .join(' · ')
}

/**
 * Where a bill opens on the web. Approvers: the claim at their own step (read-only unless it
 * waits on them), via GET /api/approvals/{id}. Admin has no single-claim page on the web yet.
 */
export function billLink(role: string | null | undefined, b: SiteBill): string | null {
  return isApproverRole(role) ? `/queue/${role}/${b.id}` : null
}

/** Initials for the employee row: first letter only (_EmployeeRow). */
export function firstInitial(name: string): string {
  const t = name.trim()
  return t.length === 0 ? '?' : t[0].toUpperCase()
}
