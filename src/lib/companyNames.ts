/**
 * Company names as ERP knows them (same table as the Flutter app's lib/src/utils/company_names.dart
 * and the backend's region_policy.ERP_COMPANY_LABELS). The internal codes (DUBAI, UAE, KSA, OMAN)
 * stay in data and sign-in; everything users see uses ERP's company code and name.
 *
 *   BRI UAE                    -> DUBAI  Blue Rhine Industries
 *   BRC                        -> UAE    Blue Rhine Contracting
 *   BRI PS Saudi, Prosigns KSA -> KSA    Professional Signs (two ERP companies: name only)
 *   Prosigns Oman              -> OMAN   Prosigns Oman
 */
const ERP_COMPANIES: Record<string, [string | null, string]> = {
  DUBAI: ['BRI UAE', 'Blue Rhine Industries'],
  UAE: ['BRC', 'Blue Rhine Contracting'],
  KSA: [null, 'Professional Signs'],
  OMAN: ['Prosigns Oman', 'Prosigns Oman'],
}

export function isErpCompany(appCode: string | null | undefined): boolean {
  return (appCode ?? '').trim().toUpperCase() in ERP_COMPANIES
}

/** "BRC · Blue Rhine Contracting", "Professional Signs"; the code itself for an unknown company. */
export function erpCompanyLabel(appCode: string | null | undefined): string {
  const code = (appCode ?? '').trim().toUpperCase()
  const entry = ERP_COMPANIES[code]
  if (!entry) return code
  const [erpCode, name] = entry
  return !erpCode || erpCode === name ? name : `${erpCode} · ${name}`
}

/** Short form for chips and tight spaces: ERP's code ("BRI UAE", "BRC"), else the name. */
export function erpCompanyShort(appCode: string | null | undefined): string {
  const code = (appCode ?? '').trim().toUpperCase()
  const entry = ERP_COMPANIES[code]
  if (!entry) return code
  return entry[0] ?? entry[1]
}
