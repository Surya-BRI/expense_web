export function QueueSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-md bg-brand-lightblue" />
      ))}
    </div>
  )
}
