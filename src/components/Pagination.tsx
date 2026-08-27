export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border border-brand-divider px-2.5 py-1 font-medium text-brand-text hover:bg-brand-lightblue disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="whitespace-nowrap text-brand-textmuted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border border-brand-divider px-2.5 py-1 font-medium text-brand-text hover:bg-brand-lightblue disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  )
}
