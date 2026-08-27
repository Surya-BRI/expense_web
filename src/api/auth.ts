import { fetchJson } from './client'
import type { AuthUser, LoginResponse } from './types'

export function login(username: string, password: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

// GET /api/auth/me does not return `username` (unlike login/refresh's `user` object).
export function me(): Promise<Omit<AuthUser, 'username'>> {
  return fetchJson('/api/auth/me')
}

export function logout(): Promise<{ ok: true }> {
  return fetchJson('/api/auth/logout', { method: 'POST' })
}
