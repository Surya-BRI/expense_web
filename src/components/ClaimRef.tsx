/**
 * How a claim is named in lists: its invoice number (unique among submitted bills -- the
 * backend refuses a second submit of the same one -- and what people see on the paper bill),
 * with the claim number underneath. Bills without an invoice number fall back to "#id".
 */
export function ClaimRef({
  id,
  billNumber,
  link = false,
}: {
  id: number
  billNumber: string | null | undefined
  /** Underlined, as the clickable reference in a table row. */
  link?: boolean
}) {
  const invoice = (billNumber ?? '').trim()
  const main = link ? 'font-medium text-brand-darkblue underline underline-offset-2' : 'font-semibold text-brand-text'
  if (!invoice) return <span className={main}>#{id}</span>
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={main} title={`Invoice ${invoice}`}>
        {invoice}
      </span>
      <span className="text-[11px] text-brand-textmuted">#{id}</span>
    </span>
  )
}
