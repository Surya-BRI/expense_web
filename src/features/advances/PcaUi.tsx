import type { ReactNode } from 'react'

/** ChoiceChip: a rounded toggle used for filters and the company picker. */
export function Chip({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-brand-darkblue bg-brand-darkblue text-white'
          : 'border-brand-divider bg-brand-card text-brand-textmuted hover:bg-brand-lightblue'
      }`}
    >
      {children}
    </button>
  )
}

/** LinearProgressIndicator: `value` 0..1, `colorClass` a bg-* token. */
export function ProgressBar({ value, colorClass, thick = false }: { value: number; colorClass: string; thick?: boolean }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded bg-brand-lightblue ${thick ? 'h-2' : 'h-[5px]'}`}
    >
      <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
