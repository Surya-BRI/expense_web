const PROD_FALLBACK = 'https://expensetracker-api.app-brisigns.com'

export function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  return fromEnv && fromEnv.length > 0 ? fromEnv : PROD_FALLBACK
}
