import { fetchJson } from './client'

/** A row of GET /api/notifications (the in-app feed; email is sent server-side). */
export interface NotificationRow {
  id: number
  type: string | null
  /** "subject\n\nbody" in one column. */
  message: string | null
  status: string | null
  sent_at: string | null
  transaction_id: number | null
  current_stage?: string | null
  /** Server-computed: is this person still a current approver for the claim right now. */
  actionable?: boolean
}

export function fetchNotifications(limit = 50, offset = 0): Promise<NotificationRow[]> {
  return fetchJson(`/api/notifications?limit=${limit}&offset=${offset}`)
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetchJson<{ unread: number }>('/api/notifications/unread-count')
  return res.unread ?? 0
}

export function markNotificationRead(id: number): Promise<unknown> {
  return fetchJson(`/api/notifications/${id}/read`, { method: 'POST' })
}

export function markAllNotificationsRead(): Promise<unknown> {
  return fetchJson('/api/notifications/read-all', { method: 'POST' })
}
