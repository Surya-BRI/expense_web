const OPTIONS = ['all', 'submitted', 'disputed'] as const
export type StatusFilter = (typeof OPTIONS)[number]

export function StatusFilterChips({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
            value === option ? 'bg-brand-darkblue text-white' : 'bg-brand-lightblue text-brand-textmuted hover:opacity-80'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
