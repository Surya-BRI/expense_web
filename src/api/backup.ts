import { fetchJson } from './client'

/** A person in a backup row or the "who can be the backup" list. */
export interface BackupPerson {
  id: number
  display_name: string
  role: string | null
  role_label: string
  department_name: string | null
}

/** One backup (delegation): while it's on, the approver's bills go to the backup. */
export interface Backup {
  id: number
  approver_id: number
  backup_id: number
  approver: BackupPerson | null
  backup: BackupPerson | null
  start_date: string
  end_date: string
  is_active: boolean
}

export interface BackupData {
  backups: Backup[]
  /** Same company, same level or higher, HOD only from the same department. */
  candidates: BackupPerson[]
  /** Today's date in Gulf time (YYYY-MM-DD), when the server sends it. */
  today?: string
}

// -- Approver: their own backup --------------------------------------------------------------

export function fetchMyBackup(): Promise<BackupData> {
  return fetchJson('/api/approvals/backup')
}

export function setMyBackup(backupId: number, startDate: string, endDate: string): Promise<Backup> {
  return fetchJson('/api/approvals/backup', {
    method: 'POST',
    body: JSON.stringify({ backup_id: backupId, start_date: startDate, end_date: endDate }),
  })
}

export function removeMyBackup(id: number): Promise<{ ok: boolean }> {
  return fetchJson(`/api/approvals/backup/${id}`, { method: 'DELETE' })
}

// -- Admin: anyone's backup ------------------------------------------------------------------

export async function fetchAdminBackup(approverId: number): Promise<BackupData> {
  const [backups, candidates] = await Promise.all([
    fetchJson<Backup[]>(`/api/admin/config/delegations?approver_id=${approverId}`),
    fetchJson<BackupPerson[]>(`/api/admin/config/delegations/candidates?approver_id=${approverId}`),
  ])
  return { backups, candidates }
}

export function adminSetBackup(approverId: number, backupId: number, startDate: string, endDate: string): Promise<Backup> {
  return fetchJson('/api/admin/config/delegations', {
    method: 'POST',
    body: JSON.stringify({ approver_id: approverId, backup_id: backupId, start_date: startDate, end_date: endDate }),
  })
}

export function adminRemoveBackup(id: number): Promise<{ ok: boolean }> {
  return fetchJson(`/api/admin/config/delegations/${id}`, { method: 'DELETE' })
}
