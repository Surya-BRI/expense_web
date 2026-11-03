import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { updateRegion, type RegionConfig } from '../../api/adminOrg'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { companyTitle, errorMessage } from './adminHelpers'
import { CodeChip, inputClass, Modal, OutlineButton, PrimaryButton } from './AdminUi'
import { ApproversTab } from './ApproversTab'
import { DepartmentsTab } from './DepartmentsTab'
import { TopupsTab } from './TopupsTab'
import { adminKeys, useAdminRegions } from './useAdminQueries'

const TABS = [
  { key: 'departments', label: 'Departments' },
  { key: 'topups', label: 'Top-ups' },
  { key: 'approvers', label: 'Approvers' },
] as const
type TabKey = (typeof TABS)[number]['key']

/** Port of lib/src/features/admin/admin_company_screen.dart (logo upload skipped). */
export function CompanyPage() {
  const { id = '' } = useParams<{ id: string }>()
  const regionId = Number(id)
  const { data: regions, isLoading, error } = useAdminRegions()

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load company.')} />

  const region = regions?.find((r) => r.id === regionId)
  if (!region) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="py-8 text-center text-sm text-brand-textmuted">Company not found</p>
      </div>
    )
  }
  return <CompanyWorkspace key={region.id} region={region} />
}

function BackLink() {
  return (
    <Link to="/admin" className="text-sm font-medium text-brand-darkblue hover:underline">
      ← Companies
    </Link>
  )
}

function CompanyWorkspace({ region }: { region: RegionConfig }) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'departments'
  const [editing, setEditing] = useState(false)

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-divider bg-brand-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-tight text-brand-text">{companyTitle(region)}</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <CodeChip code={region.region_code} />
            <span className="text-[13px] text-brand-textmuted">{region.region_name}</span>
          </div>
        </div>
        <OutlineButton onClick={() => setEditing(true)}>Edit company name</OutlineButton>
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
              onClick={() => setParams(t.key === 'departments' ? {} : { tab: t.key }, { replace: true })}
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

      {tab === 'departments' && <DepartmentsTab region={region} />}
      {tab === 'topups' && <TopupsTab region={region} />}
      {tab === 'approvers' && <ApproversTab region={region} />}

      {editing && <EditCompanyNameDialog region={region} onClose={() => setEditing(false)} />}
    </div>
  )
}

/** Name half of EditRegionScreen (admin_regions_screen.dart). */
function EditCompanyNameDialog({ region, onClose }: { region: RegionConfig; onClose: () => void }) {
  const [name, setName] = useState(region.company_name ?? '')
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: () => updateRegion(region.id, { company_name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.regions })
      onClose()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <Modal title={companyTitle(region)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2">
          <CodeChip code={region.region_code} />
          <span className="text-sm text-brand-textmuted">{region.region_name}</span>
        </div>
        <label className="block text-sm font-medium text-brand-text">
          Company name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        {save.error && <p className="text-sm text-brand-danger">{errorMessage(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <PrimaryButton type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save name'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
