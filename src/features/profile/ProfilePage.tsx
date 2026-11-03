import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { companyLabel } from '../../lib/regionFilter'
import { useAdminRegions } from '../admin/useAdminQueries'

const ROLE_LABEL: Record<string, string> = {
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  hod: 'Head of Department',
  admin: 'Admin',
  employee: 'Employee',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-divider bg-brand-card px-4 py-3">
      <div className="text-xs text-brand-textmuted">{label}</div>
      <div className="mt-0.5 font-bold text-brand-text">{value}</div>
    </div>
  )
}

/** Port of ProfileScreen: account information + sign out (no logo; the web has no logo files). */
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const regions = useAdminRegions()
  if (!user) return null

  const role = ROLE_LABEL[user.role] ?? user.role
  const company = regions.data
    ?.find((r) => r.region_code.toUpperCase() === (user.region_code ?? '').toUpperCase())
    ?.company_name?.trim()
  const covered = (user.allowed_regions ?? []).map(companyLabel)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-text">My Profile</h1>
        <p className="text-sm text-brand-textmuted">View your account information</p>
      </div>

      <div className="rounded-3xl border border-brand-divider bg-brand-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full border-2 border-brand-darkblue bg-brand-lightblue text-2xl font-extrabold text-brand-darkblue">
            {initials(user.display_name || user.username || 'U')}
          </div>
          <div>
            <div className="text-xl font-extrabold text-brand-text">{user.display_name}</div>
            <div className="text-sm text-brand-textmuted">{role}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.region_code && (
            <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-brand-orange">
              {user.region_code}
            </span>
          )}
          {company && (
            <span className="rounded-full bg-brand-lightblue px-3 py-1.5 text-xs font-bold text-brand-darkblue">
              {company}
            </span>
          )}
        </div>
      </div>

      <section className="space-y-2.5">
        <h2 className="text-sm font-bold tracking-wide text-brand-textmuted">Contact Information</h2>
        <InfoRow label="Username" value={user.username ?? '—'} />
        <InfoRow label="Role" value={role} />
        <InfoRow label="Region" value={user.region_code ?? '—'} />
        {covered.length > 1 && <InfoRow label="Companies you cover" value={covered.join(', ')} />}
        {user.department_name && <InfoRow label="Department" value={user.department_name} />}
        {user.email && <InfoRow label="Email" value={user.email} />}
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-bold tracking-wide text-brand-textmuted">Account</h2>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-brand-divider bg-brand-card px-4 py-3 text-left hover:bg-brand-background"
        >
          <span>
            <span className="block font-bold text-brand-text">Sign out</span>
            <span className="block text-xs text-brand-textmuted">Return to the sign-in screen</span>
          </span>
          <span className="text-brand-textmuted">›</span>
        </button>
      </section>

      <p className="text-center text-xs text-brand-textmuted">Blue Rhine · Expense claims</p>
    </div>
  )
}
