// Access token: in-memory only (never persisted) — smaller XSS exposure window.
// Refresh token: localStorage — persists across reloads so the session survives
// closing/reopening a tab, matching the Flutter app's "stay logged in" UX.
// See the "Token storage strategy" section of the project plan for the full
// reasoning behind this split.

const REFRESH_TOKEN_KEY = 'expense_app_refresh_token'

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } catch {
    // localStorage unavailable (e.g. private mode) — session just won't survive a reload.
  }
}

export function clearTokens(): void {
  accessToken = null
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // ignore
  }
}
