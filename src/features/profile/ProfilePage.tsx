import { useQueries, useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  PiArrowRight,
  PiBuildings,
  PiClockCounterClockwise,
  PiEnvelopeSimple,
  PiHandCoins,
  PiIdentificationBadge,
  PiMoneyWavy,
  PiSignOut,
  PiTray,
  PiUserCircle,
  PiUsersThree,
  PiWallet,
} from 'react-icons/pi'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMyFunds, fetchTopups } from '../../api/adminOrg'
import { fetchHistory, fetchQueue } from '../../api/approvals'
import { fetchPayments } from '../../api/payments'
import type { AuthUser } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { RegionLogo } from '../../components/RegionLogo'
import { formatMoney } from '../../lib/money'
import { companyLabel } from '../../lib/regionFilter'
import { stageLabel } from '../../lib/stageLabels'
import { queueStagesFor } from '../../routing/roleLanding'
import { useAdminRegions } from '../admin/useAdminQueries'

const ROLE_LABEL: Record<string, string> = {
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  hod: 'Head of Department',
  admin: 'Admin',
  employee: 'Employee',
}

const ACTION_LABEL: Record<string, string> = { approve: 'Approved', reject: 'Rejected', dispute: 'Disputed' }
const ACTION_STYLE: Record<string, string> = {
  approve: 'bg-brand-successsoft text-brand-success',
  reject: 'bg-red-50 text-brand-danger',
  dispute: 'bg-orange-100 text-brand-orange',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-divider bg-brand-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-textmuted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-lightblue text-brand-darkblue">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs text-brand-textmuted">{label}</div>
        <div className="truncate text-sm font-semibold text-brand-text" title={value}>
          {value}
        </div>
      </div>
    </div>
  )
}

function Stat({ to, icon, label, value, hint }: { to: string; icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-brand-divider bg-brand-background px-4 py-3 transition hover:border-brand-darkblue hover:bg-brand-lightblue/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-card text-brand-darkblue">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-brand-textmuted">{label}</span>
        <span className="block text-xl font-extrabold leading-tight text-brand-text">{value}</span>
        {hint && <span className="block truncate text-xs text-brand-textmuted">{hint}</span>}
      </span>
      <PiArrowRight className="h-4 w-4 text-brand-textmuted group-hover:text-brand-darkblue" aria-hidden />
    </Link>
  )
}

/** "At a glance": what's waiting for this person, by role, each linking to its page. */
function AtAGlance({ user }: { user: AuthUser }) {
  const role = user.role
  const stages = queueStagesFor(role)
  const queues = useQueries({
    queries: stages.map((s) => ({ queryKey: ['queue', s.stage], queryFn: () => fetchQueue(s.stage) })),
  })
  const topups = useQuery({
    queryKey: ['topups'],
    queryFn: () => fetchTopups(),
    enabled: role !== 'employee',
  })
  const payments = useQuery({
    queryKey: ['payments', 'unpaid', null],
    queryFn: () => fetchPayments({ status: 'unpaid' }),
    enabled: role === 'finance_manager' || role === 'admin',
  })

  const count = (n: number | undefined) => (n == null ? '…' : String(n))
  // Top-ups waiting on this role: Accounts verify 'submitted', Finance approves 'verified'.
  const waitingTopups = (topups.data ?? []).filter((t) =>
    role === 'accountant'
      ? t.status === 'submitted'
      : role === 'finance_manager'
        ? t.status === 'verified'
        : role === 'admin'
          ? t.status === 'submitted' || t.status === 'verified'
          : t.status === 'submitted' || t.status === 'verified' || t.status === 'returned',
  )
  const paymentTotals = Object.entries(payments.data?.totals ?? {})
    .map(([cur, amt]) => formatMoney(amt, cur))
    .join(' · ')

  return (
    <Card title="At a glance">
      <div className="grid gap-3 sm:grid-cols-2">
        {stages.map((s, i) => (
          <Stat
            key={s.stage}
            to={`/queue/${s.stage}`}
            icon={s.stage === 'department_hod' ? <PiUsersThree className="h-5 w-5" /> : <PiTray className="h-5 w-5" />}
            label={`${s.label === 'My Queue' ? 'Claims waiting for you' : s.label} · ${stageLabel(s.stage)}`}
            value={count(queues[i]?.data?.length)}
          />
        ))}
        {role !== 'employee' && (
          <Stat
            to="/topups"
            icon={role === 'hod' ? <PiWallet className="h-5 w-5" /> : <PiHandCoins className="h-5 w-5" />}
            label={
              role === 'accountant'
                ? 'Top-ups to verify'
                : role === 'finance_manager'
                  ? 'Top-ups to approve'
                  : role === 'hod'
                    ? 'Your top-ups in progress'
                    : 'Top-ups in progress'
            }
            value={topups.data ? String(waitingTopups.length) : '…'}
          />
        )}
        {(role === 'finance_manager' || role === 'admin') && (
          <Stat
            to="/payments"
            icon={<PiMoneyWavy className="h-5 w-5" />}
            label="Reimbursements to pay"
            value={count(payments.data?.total)}
            hint={paymentTotals || undefined}
          />
        )}
        {role === 'admin' && (
          <Stat to="/admin" icon={<PiBuildings className="h-5 w-5" />} label="Companies" value="Open" hint="Limits, top-ups, approvers" />
        )}
      </div>
    </Card>
  )
}

/** The approver's last few decisions (from My Approval History). */
function RecentActivity() {
  const { data } = useQuery({ queryKey: ['approval-history'], queryFn: () => fetchHistory(100) })
  const recent = (data ?? []).slice(0, 5)
  return (
    <Card
      title="Recent activity"
      action={
        <Link to="/history" className="text-sm font-semibold text-brand-darkblue hover:underline">
          All history
        </Link>
      }
    >
      {!data ? (
        <p className="text-sm text-brand-textmuted">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="text-sm text-brand-textmuted">You haven't approved, disputed or rejected a claim yet.</p>
      ) : (
        <ul className="divide-y divide-brand-divider">
          {recent.map((t) => (
            <li key={`${t.id}-${t.my_actioned_at}`}>
              <Link
                to={`/queue/${t.my_action_stage.split(':')[0]}/${t.id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-brand-background"
              >
                <span className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${ACTION_STYLE[t.my_action] ?? ''}`}>
                  {ACTION_LABEL[t.my_action] ?? t.my_action}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-brand-text">
                  <span className="font-semibold">{t.bill_number?.trim() || `#${t.id}`}</span> · {t.vendor_name ?? '—'} · {t.employee_name}
                </span>
                <span className="shrink-0 text-sm font-semibold text-brand-text">
                  {formatMoney(t.total_amount ?? t.amount + t.vat_amount, t.currency)}
                </span>
                <span className="hidden w-24 shrink-0 text-right text-xs text-brand-textmuted sm:block">
                  {t.my_actioned_at ? new Date(t.my_actioned_at).toLocaleDateString() : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** HOD: their department pots (one per company they cover). */
function MyPots() {
  const { data } = useQuery({ queryKey: ['my-funds'], queryFn: fetchMyFunds })
  const pots = (data ?? []).filter((f) => f.owner_type === 'department')
  if (data && pots.length === 0) return null
  return (
    <Card
      title="Your department petty cash"
      action={
        <Link to="/topups" className="text-sm font-semibold text-brand-darkblue hover:underline">
          Funds
        </Link>
      }
    >
      {!data ? (
        <p className="text-sm text-brand-textmuted">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pots.map((f) => {
            const available = f.available ?? 0
            const used = f.approved_limit > 0 ? Math.min(100, Math.max(0, (1 - available / f.approved_limit) * 100)) : 0
            return (
              <div key={f.id} className="rounded-xl border border-brand-divider p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-brand-text">
                    {(f.department_name ?? 'Department').trim()} · {companyLabel(f.region_code ?? '')}
                  </span>
                  <RegionLogo code={f.region_code} className="h-5 w-14" />
                </div>
                <div className={`mt-1 text-xl font-extrabold ${available < 0 ? 'text-brand-danger' : 'text-brand-darkblue'}`}>
                  {formatMoney(available, f.currency)}
                  <span className="ml-1 text-xs font-medium text-brand-textmuted">
                    left of {formatMoney(f.approved_limit, f.currency)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-background">
                  <div className="h-full rounded-full bg-brand-orange" style={{ width: `${used}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/** Desktop profile: identity + account on the left, role-based work overview on the right. */
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const regions = useAdminRegions()
  if (!user) return null

  const role = ROLE_LABEL[user.role] ?? user.role
  const current = (user.region_code ?? '').toUpperCase()
  const companyName = (code: string) =>
    regions.data?.find((r) => r.region_code.toUpperCase() === code.toUpperCase())?.company_name?.trim() ||
    companyLabel(code)
  const covered = [...new Set([current, ...(user.allowed_regions ?? []).map((c) => c.toUpperCase())])].filter(Boolean)
  const isApprover = user.role === 'hod' || user.role === 'accountant' || user.role === 'finance_manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-text">My profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {/* Left: identity + account */}
        <div className="space-y-6 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-2xl border border-brand-divider bg-brand-card">
            <div className="h-16 bg-brand-darkblue" />
            <div className="-mt-9 px-5 pb-5">
              <div className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-brand-card bg-brand-lightblue text-2xl font-extrabold text-brand-darkblue">
                {initials(user.display_name || user.username || 'U')}
              </div>
              <div className="mt-2 text-xl font-extrabold text-brand-text">{user.display_name}</div>
              <div className="text-sm font-medium text-brand-orange">{role}</div>

              <div className="mt-5 space-y-3.5 border-t border-brand-divider pt-4">
                <Field icon={<PiUserCircle className="h-4 w-4" />} label="Username" value={user.username ?? '—'} />
                <Field icon={<PiIdentificationBadge className="h-4 w-4" />} label="Role" value={role} />
                {user.department_name && (
                  <Field icon={<PiUsersThree className="h-4 w-4" />} label="Department" value={user.department_name} />
                )}
                {user.email && <Field icon={<PiEnvelopeSimple className="h-4 w-4" />} label="Email" value={user.email} />}
              </div>

              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-divider px-3 py-2 text-sm font-semibold text-brand-text hover:border-brand-danger hover:text-brand-danger"
              >
                <PiSignOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          </section>

          <Card title={covered.length > 1 ? 'Companies you cover' : 'Company'}>
            <ul className="space-y-2.5">
              {covered.map((code) => (
                <li
                  key={code}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    code === current ? 'border-brand-darkblue bg-brand-lightblue/50' : 'border-brand-divider'
                  }`}
                >
                  <span className="flex h-10 w-20 shrink-0 items-center justify-center rounded-md border border-brand-divider bg-white px-1">
                    <RegionLogo code={code} className="h-8 w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-text">{companyName(code)}</span>
                    <span className="block text-xs text-brand-textmuted">{code}</span>
                  </span>
                  {code === current && (
                    <span className="rounded-full bg-brand-darkblue px-2 py-0.5 text-[10px] font-bold text-white">Signed in</span>
                  )}
                </li>
              ))}
            </ul>
            {covered.length > 1 && (
              <p className="mt-3 text-xs text-brand-textmuted">Switch company from the logo at the top left.</p>
            )}
          </Card>
        </div>

        {/* Right: role-based overview */}
        <div className="space-y-6">
          <AtAGlance user={user} />
          {user.role === 'hod' && <MyPots />}
          {isApprover && <RecentActivity />}
          {user.role === 'admin' && (
            <Card title="Admin shortcuts">
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat to="/admin" icon={<PiBuildings className="h-5 w-5" />} label="Companies" value="Departments & limits" />
                <Stat to="/admin/people" icon={<PiUsersThree className="h-5 w-5" />} label="People" value="Company coverage" />
              </div>
            </Card>
          )}
          <p className="flex items-center gap-1.5 text-xs text-brand-textmuted">
            <PiClockCounterClockwise className="h-3.5 w-3.5" aria-hidden />
            Figures refresh when you open the page. Blue Rhine · Expense claims
          </p>
        </div>
      </div>
    </div>
  )
}
