import type { PettyCashFund, RegionConfig } from '../../api/adminOrg'

// Ports of lib/src/features/admin/admin_providers.dart, topups_screen.dart and
// admin_people_screen.dart helpers. Kept out of the .tsx files so those export components only.

export const ADMIN_REGION_ORDER = ['DUBAI', 'UAE', 'KSA', 'OMAN']

function regionRank(code: string | null | undefined): number {
  const i = ADMIN_REGION_ORDER.indexOf((code ?? '').toUpperCase())
  return i < 0 ? 99 : i
}

export function sortRegions(regions: RegionConfig[]): RegionConfig[] {
  return [...regions].sort((a, b) => regionRank(a.region_code) - regionRank(b.region_code))
}

export function companyTitle(region: RegionConfig): string {
  const name = (region.company_name ?? '').trim()
  return name.length > 0 ? name : region.region_name
}

export function fundCompanyName(fund: PettyCashFund): string {
  const company = (fund.company_name ?? fund.region_name ?? '').trim()
  if (company.length > 0) return company
  const code = (fund.region_code ?? '').trim()
  return code.length === 0 ? 'Company' : code
}

export function fundCompanyLabel(fund: PettyCashFund): string {
  const dept = (fund.department_name ?? fund.label ?? 'Department').trim()
  const company = fundCompanyName(fund)
  if (company === 'Company') return dept
  return `${dept} · ${company}`
}

/** lib/src/utils/currency.dart baseCurrencyForRegion: server value first, then the fixed map. */
export function baseCurrencyForRegion(region: Pick<RegionConfig, 'region_code' | 'base_currency'>): string {
  const known = (region.base_currency ?? '').trim().toUpperCase()
  if (known.length === 3) return known
  switch ((region.region_code ?? '').toUpperCase()) {
    case 'DUBAI':
    case 'UAE':
      return 'AED'
    case 'KSA':
      return 'SAR'
    case 'OMAN':
      return 'OMR'
    case 'IN':
      return 'INR'
    default:
      return 'AED'
  }
}

export function topupStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Pending Accounts'
    case 'verified':
      return 'Pending Finance'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'returned':
      return 'Returned to HOD'
    default:
      return status
  }
}

export function topupStatusStyle(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-brand-successsoft text-brand-success'
    case 'rejected':
      return 'bg-red-50 text-brand-danger'
    case 'returned':
      return 'bg-brand-warningsoft text-brand-orange'
    default:
      return 'bg-brand-lightblue text-brand-darkblue'
  }
}

export function topupActionLabel(action: string): string {
  switch (action) {
    case 'requested':
      return 'Requested'
    case 'verified':
      return 'Verified by Accounts'
    case 'returned':
      return 'Returned to HOD'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return action
  }
}

/** dd/mm/yyyy hh:mm in local time, like the Flutter top-up history. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`
}

export function roleLabel(role: string | null | undefined): string {
  switch ((role ?? '').toLowerCase()) {
    case 'finance_manager':
      return 'Finance Manager'
    case 'accountant':
      return 'Accountant'
    case 'hod':
      return 'Head of Department'
    case 'admin':
      return 'Admin'
    case 'employee':
      return 'Employee'
    default:
      return role ?? ''
  }
}

/** Two-letter initials (single word → its first two letters), as admin_people_screen.dart. */
export function initials(name: string, fallback = 'P'): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, Math.min(2, parts[0].length)).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

/** Approver-card initials: first + last word, as admin_company_screen.dart. */
export function approverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** LimitAmountSheet validation: a number ≥ 0, else null. */
export function parseAmount(raw: string): number | null {
  const t = raw.trim()
  if (t.length === 0) return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}
