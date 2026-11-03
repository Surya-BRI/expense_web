import type { AuthUser } from '../api/types'

const COMPANY_LABELS: Record<string, string> = { DUBAI: 'Dubai', UAE: 'UAE', KSA: 'KSA', OMAN: 'Oman' }

export function companyLabel(code: string): string {
  return COMPANY_LABELS[code.toUpperCase()] ?? code
}

/**
 * Regions to offer in a list's region filter. Same rule as the Flutter app
 * (lib/src/widgets/region_filter_dropdown.dart):
 * - HOD, Accountant and Finance Manager are per region (backend region_scope.py), so they get
 *   only the regions they cover: home company + the ones Admin ticked (`allowed_regions`).
 * - Admin, or anyone with no covered list, gets the regions present in the loaded list.
 */
export function regionFilterOptions(user: AuthUser | null, present: (string | null | undefined)[]): string[] {
  const norm = (codes: (string | null | undefined)[]) =>
    codes.map((c) => (c ?? '').trim().toUpperCase()).filter((c) => c.length > 0)
  const allowed = norm(user?.allowed_regions ?? [])
  const onlyAllowed = user?.role !== 'admin' && allowed.length > 0
  return [...new Set(onlyAllowed ? allowed : [...allowed, ...norm(present)])].sort()
}

/** True when `code` passes the filter (null = all). A pick no longer offered counts as "all". */
export function regionFilterMatches(selected: string | null, options: string[], code: string | null | undefined): boolean {
  if (selected === null || !options.includes(selected)) return true
  return (code ?? '').trim().toUpperCase() === selected
}

/**
 * Where a list's region filter starts: the company a multi-company person is signed in under
 * (so switching company in the header switches the lists too; "All regions" stays one click
 * away). Single-company users and Admin start on all regions.
 */
export function initialRegionFilter(user: AuthUser | null): string | null {
  if (!user || user.role === 'admin') return null
  const covered = new Set((user.allowed_regions ?? []).map((c) => c.trim().toUpperCase()))
  const current = (user.region_code ?? '').trim().toUpperCase()
  return covered.size > 1 && covered.has(current) ? current : null
}
