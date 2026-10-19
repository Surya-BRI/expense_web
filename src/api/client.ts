import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../auth/tokenStorage'
import { resolveApiBase } from './config'
import type { ApiErrorBody, LoginResponse } from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Thrown when a request gets a 401 and the refresh-token retry also fails.
// Callers (AuthProvider / route guards) catch this to force a logout redirect.
export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired')
    this.name = 'AuthExpiredError'
  }
}

function extractMessage(body: unknown): string {
  const detail = (body as ApiErrorBody | undefined)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).join('; ')
  }
  return 'Request failed'
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function rawRequest(path: string, options: RequestInit): Promise<Response> {
  return fetch(`${resolveApiBase()}${path}`, options)
}

// Plain POST with no bearer token — used for login (pre-auth) so the 401-retry
// path in fetchJson doesn't interfere with bad-credentials errors.
export async function postNoAuth(path: string, body: unknown): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await rawRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const parsed = await parseBody(res)
  return { ok: res.ok, status: res.status, body: parsed }
}

function buildOptions(options: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return { ...options, headers }
}

// Runs the refresh-token exchange once. Used both by the 401-retry path below
// and by AuthProvider's boot-time session restore.
export async function refreshSession(): Promise<LoginResponse> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new AuthExpiredError()

  const res = await rawRequest('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    throw new AuthExpiredError()
  }

  const body = (await parseBody(res)) as LoginResponse
  setAccessToken(body.access_token)
  setRefreshToken(body.refresh_token)
  return body
}

// Thin typed fetch wrapper mirroring the Flutter app's ApiClient: attaches the
// bearer token, retries exactly once through a refresh-token exchange on 401,
// and unwraps FastAPI's `detail` error shape into a plain message.
export async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, buildOptions(options, getAccessToken()))

  if (res.status === 401) {
    try {
      await refreshSession()
    } catch {
      throw new AuthExpiredError()
    }
    res = await rawRequest(path, buildOptions(options, getAccessToken()))
    if (res.status === 401) {
      clearTokens()
      throw new AuthExpiredError()
    }
  }

  const body = await parseBody(res)
  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(body))
  }
  return body as T
}
