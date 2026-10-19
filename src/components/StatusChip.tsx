const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  submitted: { label: 'In progress',   style: 'bg-brand-lightblue text-brand-darkblue' },
  disputed:  { label: 'Corrected',     style: 'bg-orange-100 text-brand-orange' },
  approved:  { label: 'Approved',      style: 'bg-brand-successsoft text-brand-success' },
  rejected:  { label: 'Rejected',      style: 'bg-red-50 text-brand-danger' },
  paid:      { label: 'Paid',          style: 'bg-brand-successsoft text-brand-success' },
}

export function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg?.style ?? 'bg-gray-100 text-brand-textmuted'}`}>
      {cfg?.label ?? status}
    </span>
  )
}
