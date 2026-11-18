import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RegionConfig } from '../../api/adminOrg'
import type { PcaFund } from '../../api/pca'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { companyTitle, errorMessage } from '../admin/adminHelpers'
import { CodeChip } from '../admin/AdminUi'
import { AccountsCashPanel } from './AccountsCashPanel'
import { PcaDepartmentsPanel } from './PcaDepartmentsPanel'
import { PcaRequestCard } from './PcaRequestCard'
import { PcaRequestsPanel } from './PcaRequestsPanel'
import { Chip } from './PcaUi'
import { defaultPcaRegionId, usePcaAdvances, usePcaRegions, usePcaRequests } from './pcaHelpers'

const TABS = [
  { key: 'employees', label: 'Employees' },
  { key: 'requests', label: 'Requests' },
  { key: 'accounts-cash', label: 'Accounts cash' },
] as const

type TabKey = (typeof TABS)[number]['key']

/**
 * Port of AdvancesScreen (advances_screen.dart), Professional Signs' employee petty cash (PCA).
 * HOD, Accounts Manager (finance_manager), Accounts (accountant) and Admin: Employees (department
 * → employees, where the HOD / Admin sets each person's petty cash) and Requests (approve, verify,
 * pay, reject). The Accounts Manager, Accounts and Admin also get the Accounts Department's own
 * petty cash. An employee gets "My advances".
 */
export function AdvancesPage() {
  const { user } = useAuth()
  const role = user?.role
  const [params, setParams] = useSearchParams()

  if (role === 'employee') {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-brand-text">My advances</h1>
        <MyAdvances />
      </div>
    )
  }

  // The Accounts Department's own petty cash (PDF section 6): Accounts Manager, Accounts, Admin.
  const accountsCash = role === 'finance_manager' || role === 'accountant' || role === 'admin'
  const tabs = TABS.filter((t) => t.key !== 'accounts-cash' || accountsCash)
  const raw = params.get('tab')
  const tab: TabKey = tabs.some((t) => t.key === raw) ? (raw as TabKey) : 'employees'

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-text">Advances</h1>

      <div role="tablist" className="flex gap-1 border-b border-brand-divider">
        {tabs.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams(t.key === 'employees' ? {} : { tab: t.key }, { replace: true })}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                active
                  ? 'border-brand-orange text-brand-darkblue'
                  : 'border-transparent text-brand-textmuted hover:text-brand-text'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Petty cash is set from Employees → department → an employee (no separate button). */}
      {tab === 'employees' && <CompanyPicker>{(region) => <PcaDepartmentsPanel region={region} />}</CompanyPicker>}
      {tab === 'requests' && <PcaRequestsPanel />}
      {tab === 'accounts-cash' && (
        <CompanyPicker>{(region) => <AccountsCashPanel regionId={region.id} />}</CompanyPicker>
      )}
    </div>
  )
}

/**
 * _CompanyPicker: the employee-advance company to show, the one signed in under by default, with
 * chips to switch when several are covered (e.g. Admin).
 */
function CompanyPicker({ children }: { children: (region: RegionConfig) => ReactNode }) {
  const { user } = useAuth()
  const { data, isLoading, error } = usePcaRegions(user)
  const [picked, setPicked] = useState<number | null>(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load companies.')} />
  const regions = data ?? []
  if (regions.length === 0) {
    return <p className="py-8 text-center text-sm text-brand-textmuted">No company gives employee advances.</p>
  }
  const regionId = regions.some((r) => r.id === picked) ? picked : defaultPcaRegionId(regions, user)
  const region = regions.find((r) => r.id === regionId) ?? regions[0]

  return (
    <div className="space-y-3">
      {regions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <Chip key={r.id} selected={r.id === region.id} onClick={() => setPicked(r.id)}>
              {companyTitle(r)}
            </Chip>
          ))}
        </div>
      )}
      {children(region)}
    </div>
  )
}

/** _MyAdvancesView: the employee's own petty cash and their requests. */
function MyAdvances() {
  const advances = usePcaAdvances()
  const requests = usePcaRequests()
  const { user } = useAuth()
  const mine = (advances.data ?? []).filter((f) => f.approved_limit > 0 && (user == null || f.employee_id === user.id))

  return (
    <div className="space-y-4">
      {advances.isLoading && <LoadingSpinner />}
      {advances.error && <ErrorBanner message={errorMessage(advances.error)} />}
      {advances.data &&
        (mine.length === 0 ? (
          <div className="rounded-2xl border border-brand-divider bg-brand-card p-4 text-sm text-brand-textmuted">
            You have no petty cash yet. Your HOD sets the amount. Until then, file bills as reimbursements.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((f) => (
              <MyAdvanceCard key={f.id} fund={f} />
            ))}
          </div>
        ))}

      <h2 className="text-[13px] font-extrabold tracking-wide text-brand-darkblue">Requests</h2>
      {requests.isLoading && <LoadingSpinner />}
      {requests.error && <ErrorBanner message={errorMessage(requests.error)} />}
      {requests.data &&
        (requests.data.length === 0 ? (
          <p className="text-sm text-brand-textmuted">No requests yet.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {requests.data.map((r) => (
              <PcaRequestCard key={r.id} request={r} />
            ))}
          </div>
        ))}
    </div>
  )
}

/** _MyAdvanceCard + PcaFundFigures (compact). */
function MyAdvanceCard({ fund }: { fund: PcaFund }) {
  const money = (v: number | undefined) => formatMoney(v ?? 0, fund.currency)
  // Hard limit (Professional Signs: 50%): lead with what can still be used until bills are paid.
  const limit = fund.spend_limit ?? null
  const canUse = Math.max(0, fund.uncommitted ?? 0)
  const blocked = limit != null && canUse <= 0.004
  const unreplenished = fund.unreplenished_spend ?? 0
  return (
    <div className="space-y-3 rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div>
        <div className="text-lg font-extrabold text-brand-darkblue">Petty cash advance</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-textmuted">
          {fund.region_code && <CodeChip code={fund.region_code} />}
          for all your projects
        </div>
      </div>
      <div className={`rounded-xl px-3.5 py-2.5 ${blocked ? 'bg-brand-warningsoft' : 'bg-brand-lightblue'}`}>
        <div className="text-[11px] font-bold tracking-wide text-brand-darkblue">{limit != null ? 'Can use now' : 'Available'}</div>
        <div className="text-xl font-extrabold text-brand-darkblue">{money(limit != null ? canUse : fund.available)}</div>
        {limit != null && (
          <div className={`text-[11.5px] ${blocked ? 'font-bold text-brand-orange' : 'text-brand-textmuted'}`}>
            {blocked
              ? 'Limit reached: you can use more once Accounts pays your approved bills.'
              : `Up to ${money(limit)} of bills until they are paid`}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {(
          [
            ['Approved limit', fund.approved_limit],
            ['Spent', fund.spent],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-md bg-brand-background px-3 py-2">
            <dt className="text-xs text-brand-textmuted">{label}</dt>
            <dd className="text-sm font-bold text-brand-text">{money(value)}</dd>
          </div>
        ))}
        <div
          className={`col-span-2 rounded-md px-3 py-2 ${(fund.pending_topup ?? 0) > 0 ? 'bg-brand-warningsoft' : 'bg-brand-background'}`}
        >
          <dt className="text-xs text-brand-textmuted">Pending top-up</dt>
          <dd className="text-sm font-bold text-brand-text">{money(fund.pending_topup)}</dd>
        </div>
      </dl>
      {unreplenished > 0 && (
        <p className="text-[12.5px] text-brand-text">
          {money(unreplenished)} of approved bills waiting for Accounts to pay. Your petty cash is refilled when they do.
        </p>
      )}
    </div>
  )
}
