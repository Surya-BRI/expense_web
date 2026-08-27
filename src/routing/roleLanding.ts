import type { Role } from '../api/types'

// v1 only supports hod and accountant logins for this web app (finance_manager
// and admin are handled by the existing Flutter app) — see the project plan's
// "finance_manager scoping" note.
const STAGE_BY_ROLE: Partial<Record<Role, string>> = {
  hod: 'hod',
  accountant: 'accountant',
}

export function landingPathFor(role: Role): string {
  const stage = STAGE_BY_ROLE[role]
  return stage ? `/queue/${stage}` : '/login'
}

export function isSupportedRole(role: Role): boolean {
  return role in STAGE_BY_ROLE
}
