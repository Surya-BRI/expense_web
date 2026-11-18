import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { RegionConfig } from '../../api/adminOrg'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { RegionLogo } from '../../components/RegionLogo'
import { companyTitle, errorMessage } from '../admin/adminHelpers'
import { CodeChip, inputClass } from '../admin/AdminUi'
import { useAdminRegions } from '../admin/useAdminQueries'
import { SitePotsPanel } from './SitePotsPanel'
import { SiteTopupsPanel } from './SiteTopupsPanel'
import { pickSiteRegion, usesSitePots } from './sitePcaHelpers'

const TABS = [
  { key: 'employees', label: 'Employees' },
  { key: 'topups', label: 'Top-ups' },
] as const
type TabKey = (typeof TABS)[number]['key']

/**
 * Port of SitePcaScreen (lib/src/features/pca/site_pca_screen.dart) for approvers and Admin:
 * Blue Rhine Contracting's petty cash -- "Employees" (each employee's petty cash, their bills,
 * set / change it, prepare a top-up) and "Top-ups" (Head of Accountant approves, Finance
 * Manager approves and records the bank withdrawal, either may reject).
 *
 * The company is the site-model one the user is signed in under, else the first; Admin can
 * switch when more than one company uses this flow.
 */
export function SitePcaPage() {
  const { user } = useAuth()
  const { data: regions, isLoading, error } = useAdminRegions()
  const [pickedId, setPickedId] = useState<number | null>(null)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load companies.')} />

  const sites = (regions ?? []).filter(usesSitePots)
  const region = sites.find((r) => r.id === pickedId) ?? pickSiteRegion(regions ?? [], user)

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-brand-text">Petty cash</h1>
      {region == null ? (
        <p className="py-8 text-center text-sm text-brand-textmuted">No company uses this petty cash flow.</p>
      ) : (
        <SiteWorkspace
          key={region.id}
          region={region}
          sites={user?.role === 'admin' ? sites : []}
          onPick={setPickedId}
        />
      )}
    </div>
  )
}

function SiteWorkspace({
  region,
  sites,
  onPick,
}: {
  region: RegionConfig
  sites: RegionConfig[]
  onPick: (id: number) => void
}) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'employees'

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-divider bg-brand-card px-4 py-3">
        <RegionLogo code={region.region_code} className="h-9 w-auto" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold leading-tight text-brand-text">{companyTitle(region)}</div>
          <div className="mt-1 flex items-center gap-2">
            <CodeChip code={region.region_code} />
            <span className="text-[13px] text-brand-textmuted">One petty cash per employee, for all their sites</span>
          </div>
        </div>
        {sites.length > 1 && (
          <select
            aria-label="Company"
            value={region.id}
            onChange={(e) => {
              onPick(Number(e.target.value))
              setParams({}, { replace: true })
            }}
            className={`${inputClass} w-auto`}
          >
            {sites.map((r) => (
              <option key={r.id} value={r.id}>
                {companyTitle(r)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div role="tablist" className="flex gap-1 border-b border-brand-divider">
        {TABS.map((t) => {
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

      {tab === 'employees' && <SitePotsPanel region={region} />}
      {tab === 'topups' && <SiteTopupsPanel region={region} />}
    </>
  )
}
