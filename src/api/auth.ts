import { ApiError, fetchJson, postNoAuth } from './client'
import type { AuthUser, LoginResponse } from './types'

// Thrown when the backend asks the user to pick a region before login completes.
// Mirrors Flutter's RegionSelectionRequired in api_client.dart.
export class RegionSelectionRequired extends Error {
  allowedRegions: string[]
  constructor(regions: string[]) {
    super('Region selection required')
    this.name = 'RegionSelectionRequired'
    this.allowedRegions = regions
  }
}

// Login uses a raw no-auth POST so the 401-retry path in fetchJson doesn't
// intercept a wrong-password 401 and turn it into an AuthExpiredError.
export async function login(
  username: string,
  password: string,
  regionCode?: string,
): Promise<LoginResponse> {
  const res = await postNoAuth('/api/auth/login', {
    username,
    password,
    region_code: regionCode ?? null,
  })

  if (!res.ok) {
    // Backend returns 400 + { detail: { region_required: true, allowed_regions: [...] } }
    // for multi-region accounts that haven't chosen a region yet.
    const detail = (res.body as { detail?: { region_required?: boolean; allowed_regions?: string[] } } | null)?.detail
    if (res.status === 400 && detail && typeof detail === 'object' && detail.region_required) {
      throw new RegionSelectionRequired(detail.allowed_regions ?? [])
    }
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg: string }) => d.msg).join('; ')
          : 'Invalid username or password'
    throw new ApiError(res.status, message)
  }

  return res.body as LoginResponse
}

// GET /api/auth/me does not return `username` (unlike login/refresh's `user` object).
export function me(): Promise<Omit<AuthUser, 'username'>> {
  return fetchJson('/api/auth/me')
}

export function logout(): Promise<{ ok: true }> {
  return fetchJson('/api/auth/logout', { method: 'POST' })
}
