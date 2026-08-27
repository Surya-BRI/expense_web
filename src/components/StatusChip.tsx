// Mirrors app_theme.dart's status colors (success/danger/warningSoft/lightBlue).
const STYLES: Record<string, string> = {
  submitted: 'bg-brand-warningsoft text-amber-800',
  disputed: 'bg-orange-100 text-brand-orange',
  approved: 'bg-brand-lightblue text-brand-darkblue',
  rejected: 'bg-red-50 text-brand-danger',
  paid: 'bg-brand-successsoft text-brand-success',
}

export function StatusChip({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-gray-100 text-brand-textmuted'
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  )
}
