export function SearchInput({
  value,
  onChange,
  placeholder = 'Search by employee, vendor…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-xl border border-brand-divider bg-brand-card px-3 py-2 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none"
    />
  )
}
