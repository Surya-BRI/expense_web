import { useState } from 'react'
import type { RegionConfig } from '../../api/adminOrg'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { errorMessage } from '../admin/adminHelpers'
import { PcaRequestCard } from './PcaRequestCard'
import { Chip } from './PcaUi'
import { hasPcaAction, pcaActionsFor, usePcaRequests } from './pcaHelpers'

/**
 * Port of PcaRequestsView (advances_screen.dart): "Active" = what the signed-in person can act
 * on now, "History" = every request they can see. With `region` (Admin's company page) only
 * that company's requests are listed.
 */
export function PcaRequestsPanel({ region }: { region?: RegionConfig }) {
  const { user } = useAuth()
  const [activeOnly, setActiveOnly] = useState(true)
  const { data, isLoading, error } = usePcaRequests()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load requests.')} />

  const all = (data ?? []).filter(
    (r) => region == null || r.fund?.region_id === region.id || (r.fund == null && r.region_code === region.region_code),
  )
  const waiting = all.filter((r) => hasPcaAction(pcaActionsFor(r, user?.role)))
  const items = activeOnly ? waiting : all

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip selected={activeOnly} onClick={() => setActiveOnly(true)}>
          Active ({waiting.length})
        </Chip>
        <Chip selected={!activeOnly} onClick={() => setActiveOnly(false)}>
          History ({all.length})
        </Chip>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-brand-textmuted">
          {activeOnly ? 'Nothing is waiting for you.' : 'No history yet.'}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((r) => (
            <PcaRequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}
