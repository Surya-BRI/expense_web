import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchMyFunds, type PettyCashFund, type TopupRequest } from '../../api/adminOrg'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { RegionFilterSelect } from '../../components/RegionFilterSelect'
import { formatMoney } from '../../lib/money'
import { companyLabel, initialRegionFilter, regionFilterMatches, regionFilterOptions } from '../../lib/regionFilter'
import { ADMIN_REGION_ORDER, errorMessage, fundCompanyName } from '../admin/adminHelpers'
import { CodeChip, PrimaryButton } from '../admin/AdminUi'
import { RaiseTopupDialog } from '../admin/RaiseTopupDialog'
import { TopupRequestCard } from '../admin/TopupRequestCard'
import { useTopups } from '../admin/useAdminQueries'

const topupRegion = (t: TopupRequest) => t.fund?.region_code ?? t.region_code

function regionRank(code: string | null | undefined): number {
  const i = ADMIN_REGION_ORDER.indexOf((code ?? '').toUpperCase())
  return i < 0 ? 99 : i
}

/**
 * Port of topups_screen.dart. Accountant / Finance Manager / Admin: every top-up request
 * they can act on, with Verify / Return / Approve / Reject. HOD: "Funds" -- their department
 * pots with "Request top-up", then their top-up requests.
 */
export function TopupsPage() {
  const { user } = useAuth()
  const isHod = user?.role === 'hod'
  // null = all regions; starts on the signed-in company for multi-company people.
  const [region, setRegion] = useState<string | null>(() => initialRegionFilter(user))

  const topups = useTopups()
  const funds = useQuery({ queryKey: ['my-funds'], queryFn: fetchMyFunds, enabled: isHod })

  const deptFunds = useMemo(
    () =>
      (funds.data ?? [])
        .filter((f) => f.owner_type === 'department')
        .sort((a, b) => regionRank(a.region_code) - regionRank(b.region_code)),
    [funds.data],
  )

  const regions = regionFilterOptions(user, [
    ...(topups.data ?? []).map(topupRegion),
    ...deptFunds.map((f) => f.region_code),
  ])
  const filtering = region !== null && regions.includes(region)
  const shownTopups = (topups.data ?? []).filter((t) => regionFilterMatches(region, regions, topupRegion(t)))
  const shownFunds = deptFunds.filter((f) => regionFilterMatches(region, regions, f.region_code))

  const loading = topups.isLoading || (isHod && funds.isLoading)
  const error = topups.error ?? (isHod ? funds.error : null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">{isHod ? 'Funds' : 'Top-ups'}</h1>
        {regions.length > 1 && <RegionFilterSelect options={regions} value={region} onChange={setRegion} />}
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load top-ups.')} />}

      {!loading && !error && isHod && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shownFunds.length === 0 ? (
            <p className="col-span-full py-4 text-center text-sm text-brand-textmuted">
              {filtering
                ? `No petty cash for ${companyLabel(region as string)}.`
                : 'No petty cash is set up for your department yet. Ask Admin to set an approved limit.'}
            </p>
          ) : (
            shownFunds.map((f) => <HodFundCard key={f.id} fund={f} />)
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {isHod && <h2 className="text-sm font-extrabold tracking-wide text-brand-darkblue">Top-ups</h2>}
          {shownTopups.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-textmuted">
              {filtering ? `No top-up requests for ${companyLabel(region as string)}` : 'No top-up requests yet'}
            </p>
          ) : (
            shownTopups.map((t) => <TopupRequestCard key={t.id} request={t} />)
          )}
        </div>
      )}
    </div>
  )
}

/** _HodFundCard: the company, the department pot's figures and "Request top-up". */
function HodFundCard({ fund }: { fund: PettyCashFund }) {
  const [raising, setRaising] = useState(false)
  const money = (v: number | undefined) => formatMoney(v ?? 0, fund.currency)
  const figures: [string, number | undefined][] = [
    ['Available', fund.available],
    ['Approved limit', fund.approved_limit],
    ['Spent', fund.spent],
    ['Pending top-up', fund.pending_topup],
  ]
  return (
    <div className="space-y-3 rounded-2xl border border-brand-divider bg-brand-card p-4">
      <div>
        <div className="text-lg font-extrabold leading-tight text-brand-darkblue">{fundCompanyName(fund)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {fund.region_code && <CodeChip code={fund.region_code} />}
          <span className="text-sm text-brand-textmuted">{(fund.department_name ?? 'Department').trim()} petty cash</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {figures.map(([label, value]) => (
          <div key={label} className="rounded-md bg-brand-background px-3 py-2">
            <dt className="text-xs text-brand-textmuted">{label}</dt>
            <dd className="text-sm font-bold text-brand-text">{money(value)}</dd>
          </div>
        ))}
      </dl>
      <PrimaryButton className="w-full" onClick={() => setRaising(true)}>
        Request top-up
      </PrimaryButton>
      {raising && <RaiseTopupDialog fund={fund} onClose={() => setRaising(false)} />}
    </div>
  )
}
