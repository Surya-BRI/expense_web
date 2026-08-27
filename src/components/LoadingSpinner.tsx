export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-brand-textmuted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-divider border-t-brand-darkblue" />
      {label}
    </div>
  )
}
