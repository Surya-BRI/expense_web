export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    // Unknown/invalid ISO currency code — fall back to a plain "CODE amount" format.
    return `${currency} ${amount.toFixed(2)}`
  }
}
