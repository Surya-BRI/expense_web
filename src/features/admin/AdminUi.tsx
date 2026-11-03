import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'

/** Light-blue region code chip ("DUBAI"), as _CodeChip in the Flutter admin screens. */
export function CodeChip({ code }: { code: string }) {
  return (
    <span className="inline-block rounded-md bg-brand-lightblue px-2 py-0.5 text-[11px] font-bold tracking-wide text-brand-darkblue">
      {code.toUpperCase()}
    </span>
  )
}

export function Avatar({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-[13px]'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-lightblue font-extrabold text-brand-darkblue ${dims}`}
    >
      {text}
    </span>
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md bg-brand-darkblue px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export function OutlineButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md border border-brand-divider bg-brand-card px-3 py-1.5 text-sm font-semibold text-brand-darkblue hover:bg-brand-lightblue disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

/** Centered dialog; replaces the Flutter bottom sheets / AlertDialogs. Escape or backdrop closes. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-brand-card p-5 shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold text-brand-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 text-lg leading-none text-brand-textmuted hover:bg-brand-background"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const inputClass =
  'w-full rounded-md border border-brand-divider bg-brand-card px-3 py-2 text-sm text-brand-text focus:border-brand-darkblue focus:outline-none'
