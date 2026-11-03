// Company logos per region, same mapping as the Flutter app (lib/src/widgets/region_branding.dart):
// a region without its own logo (e.g. OMAN) shows the Dubai / Blue Rhine Industries one.
const LOGO_BY_REGION: Record<string, string> = {
  DUBAI: '/logos/Dubai_LOGO.png',
  UAE: '/logos/UAE_LOGO.png',
  KSA: '/logos/KSA_LOGO.png',
}
const DEFAULT_LOGO = '/logos/Dubai_LOGO.png'

function regionLogoUrl(code: string | null | undefined): string {
  return LOGO_BY_REGION[(code ?? '').trim().toUpperCase()] ?? DEFAULT_LOGO
}

/** A region's company logo, scaled to fit inside the given box. */
export function RegionLogo({
  code,
  className = 'h-8 w-auto',
  alt,
}: {
  code: string | null | undefined
  className?: string
  alt?: string
}) {
  return (
    <img
      src={regionLogoUrl(code)}
      alt={alt ?? `${(code ?? '').toUpperCase() || 'Company'} logo`}
      className={`object-contain ${className}`}
      draggable={false}
    />
  )
}
