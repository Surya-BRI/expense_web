import { fetchJson } from './client'

/** One approval step's SLA time (GET /api/admin/config/regions/:id/sla). */
export interface SlaStage {
  stage: string
  label: string
  hours: number
}

export interface RegionSla {
  region_id: number
  stages: SlaStage[]
  min_hours: number
  max_hours: number
}

/** Admin: SLA time per approval step for one company. */
export function fetchRegionSla(regionId: number): Promise<RegionSla> {
  return fetchJson(`/api/admin/config/regions/${regionId}/sla`)
}

/** Saves step -> hours (0.25 = 15 min). Other company settings are kept; open bills move to the new times. */
export function updateRegionSla(regionId: number, slaHours: Record<string, number>): Promise<RegionSla> {
  return fetchJson(`/api/admin/config/regions/${regionId}/sla`, {
    method: 'PUT',
    body: JSON.stringify({ sla_hours: slaHours }),
  })
}

export interface AgingItem {
  transaction_id: number
  employee_name: string | null
  company: string | null
  vendor: string | null
  total_amount: number
  currency: string
  stage_label: string | null
  approvers: string[]
  stage_due_at: string | null
  waiting_text: string | null
  overdue_text: string | null
  /** on_time | breached | escalated */
  sla_status: string
  age_bucket: string
}

export interface AgingReport {
  summary: {
    pending: number
    on_time: number
    breached: number
    escalated: number
    buckets: Record<string, number>
  }
  bucket_labels: Record<string, string>
  items: AgingItem[]
}

/** Admin: every bill waiting on an approver, most overdue first. */
export function fetchAgingReport(regionId?: number | null): Promise<AgingReport> {
  return fetchJson(`/api/admin/reports/aging${regionId ? `?region_id=${regionId}` : ''}`)
}

/** "24 hrs", "1 hr 30 min", "15 min" -- always hours, never days (same as the app). */
export function formatSlaHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const parts = [h > 0 ? `${h} hr${h === 1 ? '' : 's'}` : '', m > 0 ? `${m} min` : ''].filter(Boolean)
  return parts.length === 0 ? '0 min' : parts.join(' ')
}

/** Past the current step's SLA time (stage_due_at is naive UTC). */
export function isOverdue(stageDueAt: string | null | undefined): boolean {
  if (!stageDueAt) return false
  const due = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(stageDueAt) ? stageDueAt : `${stageDueAt}Z`)
  return !Number.isNaN(due.getTime()) && Date.now() > due.getTime()
}
