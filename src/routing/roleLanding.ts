import type { Role } from '../api/types'

// Approver roles work their queues. Employees have no web screens (they use the Flutter app).
const STAGE_BY_ROLE: Partial<Record<Role, string>> = {
  hod: 'hod',
  accountant: 'accountant',
  finance_manager: 'finance_manager',
}

// Admin is organisation setup (Companies, People), not an approver -- same as the Flutter
// app, which keeps Admin out of the approval queues (lib/src/routing/app_router.dart).
export const ADMIN_HOME = '/admin'

export function landingPathFor(role: Role): string {
  if (role === 'admin') return ADMIN_HOME
  const stage = STAGE_BY_ROLE[role]
  return stage ? `/queue/${stage}` : '/login'
}

export function isSupportedRole(role: Role): boolean {
  return role === 'admin' || role in STAGE_BY_ROLE
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
