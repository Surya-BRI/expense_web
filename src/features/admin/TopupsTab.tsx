import { useState } from 'react'
import type { RegionConfig } from '../../api/adminOrg'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { errorMessage } from './adminHelpers'
import { PrimaryButton } from './AdminUi'
import { RaiseTopupDialog } from './RaiseTopupDialog'
import { TopupRequestCard } from './TopupRequestCard'
import { useTopups } from './useAdminQueries'

/** "Top-ups" tab of admin_company_screen.dart, plus the Admin "Request top-up" action. */
export function TopupsTab({ region }: { region: RegionConfig }) {
  const { data, isLoading, error } = useTopups()
  const [raising, setRaising] = useState(false)
  const mine = (data ?? []).filter((t) => t.fund?.region_id === region.id)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PrimaryButton onClick={() => setRaising(true)}>+ Request top-up</PrimaryButton>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load top-ups.')} />}

      {data && mine.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">No top-ups for this company yet</p>
      )}

      {mine.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {mine.map((t) => (
            <TopupRequestCard key={t.id} request={t} />
          ))}
        </div>
      )}

      {raising && <RaiseTopupDialog region={region} onClose={() => setRaising(false)} />}
    </div>
  )
}
