import { useState, type FormEvent } from 'react'
import { parseAmount } from './adminHelpers'
import { inputClass, Modal, OutlineButton, PrimaryButton } from './AdminUi'

/** Port of limit_amount_sheet.dart: one amount field, "Enter a valid amount" on bad input. */
export function LimitAmountDialog({
  title,
  confirmLabel,
  currency,
  initial,
  busy = false,
  serverError,
  onConfirm,
  onClose,
}: {
  title: string
  confirmLabel: string
  currency: string
  initial?: number | null
  busy?: boolean
  serverError?: string | null
  onConfirm: (amount: number) => void
  onClose: () => void
}) {
  const [text, setText] = useState(() =>
    initial == null ? '' : String(initial),
  )
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseAmount(text)
    if (parsed === null) {
      setError('Enter a valid amount')
      return
    }
    setError(null)
    onConfirm(parsed)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium text-brand-text">
          Amount ({currency})
          <input
            autoFocus
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        {(error ?? serverError) && <p className="text-sm text-brand-danger">{error ?? serverError}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
