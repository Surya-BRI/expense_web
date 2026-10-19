import type { Role } from '../api/types'

// v1 only supports hod and accountant logins for this web app (finance_manager
// and admin are handled by the existing Flutter app) — see the project plan's
// "finance_manager scoping" note.
const STAGE_BY_ROLE: Partial<Record<Role, string>> = {
  hod: 'hod',
  accountant: 'accountant',
  finance_manager: 'finance_manager',
}

export function landingPathFor(role: Role): string {
  const stage = STAGE_BY_ROLE[role]
  return stage ? `/queue/${stage}` : '/login'
}

export function isSupportedRole(role: Role): boolean {
  return role in STAGE_BY_ROLE
}

// An HOD user can appear in both the hod stage (own-department claims) and the
// department_hod stage (cross-department claims where their dept owns the category).
// Returns all queue stages this role should be able to navigate to.
export function queueStagesFor(role: Role): { stage: string; label: string }[] {
  if (role === 'hod') {
    return [
      { stage: 'hod', label: 'My Queue' },
      { stage: 'department_hod', label: 'Dept HOD Queue' },
    ]
  }
  if (role === 'accountant') {
    return [{ stage: 'accountant', label: 'My Queue' }]
  }
  if (role === 'finance_manager') {
    return [{ stage: 'finance_manager', label: 'My Queue' }]
  }
  return []
}
