export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-brand-danger/30 bg-red-50 px-4 py-3 text-sm text-brand-danger">
      {message}
    </div>
  )
}
