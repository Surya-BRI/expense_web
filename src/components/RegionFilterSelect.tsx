import { companyLabel } from '../lib/regionFilter'

/** "All regions / UAE / KSA ..." dropdown for lists that mix regions. Callers hide it when
 * there is only one region to choose from. */
export function RegionFilterSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <select
      aria-label="Filter by region"
      value={value !== null && options.includes(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      className="h-8 rounded-md border border-brand-divider bg-brand-card px-2 text-sm font-semibold text-brand-text"
    >
      <option value="">All regions</option>
      {options.map((code) => (
        <option key={code} value={code}>
          {companyLabel(code)}
        </option>
      ))}
    </select>
  )
}
