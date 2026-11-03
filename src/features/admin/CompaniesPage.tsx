import { Link } from 'react-router-dom'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { RegionLogo } from '../../components/RegionLogo'
import { companyTitle, errorMessage } from './adminHelpers'
import { CodeChip } from './AdminUi'
import { useAdminRegions } from './useAdminQueries'

/** Port of lib/src/features/admin/admin_hub_screen.dart. */
export function CompaniesPage() {
  const { data: regions, isLoading, error } = useAdminRegions()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">Companies</h1>
        <Link
          to="/admin/people"
          className="rounded-md border border-brand-divider bg-brand-card px-3 py-1.5 text-sm font-semibold text-brand-darkblue hover:bg-brand-lightblue"
        >
          People
        </Link>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load companies.')} />}

      {regions && regions.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">No companies configured</p>
      )}

      {regions && regions.length > 0 && (
        <>
          <p className="text-sm text-brand-textmuted">
            Open a company to set department limits, request top-ups, and change the name.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {regions.map((r) => (
              <Link
                key={r.id}
                to={`/admin/companies/${r.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-brand-divider bg-brand-card transition hover:border-brand-darkblue hover:shadow-sm"
              >
                {/* Logo band, as on the Flutter company cards. */}
                <div className="flex h-24 items-center justify-center bg-[#F4F6F8] px-7 py-4">
                  <RegionLogo code={r.region_code} className="h-full w-full" alt={companyTitle(r)} />
                </div>
                <div className="flex items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-extrabold leading-tight text-brand-text">{companyTitle(r)}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CodeChip code={r.region_code} />
                    <span className="text-[13px] text-brand-textmuted">Open for departments and limits</span>
                  </div>
                </div>
                <span className="text-lg text-brand-textmuted group-hover:text-brand-darkblue" aria-hidden>
                  ›
                </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
