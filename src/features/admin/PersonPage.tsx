import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { setUserRegions, type OrgUser, type RegionConfig } from '../../api/adminOrg'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { companyTitle, errorMessage, initials, roleLabel } from './adminHelpers'
import { Avatar, PrimaryButton } from './AdminUi'
import { adminKeys, useAdminRegions, useAdminUser } from './useAdminQueries'

/** Port of AdminPersonScreen (admin_people_screen.dart): details + "companies this person covers". */
export function PersonPage() {
  const { id = '' } = useParams<{ id: string }>()
  const userId = Number(id)
  const { data: user, isLoading, error } = useAdminUser(userId)
  const regions = useAdminRegions()
  const navigate = useNavigate()
  const location = useLocation()

  // Back to the list with its filters when we came from it; otherwise to /admin/people.
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/admin/people')
  }

  const back = (
    <button type="button" onClick={goBack} className="text-sm font-medium text-brand-darkblue hover:underline">
      ← People
    </button>
  )

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <div className="space-y-3">
        {back}
        <p className="py-8 text-center text-sm text-brand-textmuted">Person not found</p>
      </div>
    )
  }
  if (isLoading || regions.isLoading) return <LoadingSpinner />
  if (error || !user) {
    return (
      <div className="space-y-3">
        {back}
        <ErrorBanner message={errorMessage(error, 'Person not found')} />
      </div>
    )
  }
  if (regions.error) return <ErrorBanner message={errorMessage(regions.error, 'Failed to load companies.')} />

  return (
    <div className="space-y-4">
      {back}
      <PersonDetails key={user.id} user={user} regions={regions.data ?? []} onSaved={goBack} />
    </div>
  )
}

function selectedFrom(user: OrgUser): Set<string> {
  const out = new Set(user.region_codes.map((c) => c.toUpperCase()))
  const home = (user.home_region_code ?? '').toUpperCase()
  if (home) out.add(home)
  return out
}

function PersonDetails({ user, regions, onSaved }: { user: OrgUser; regions: RegionConfig[]; onSaved: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(() => selectedFrom(user))
  const qc = useQueryClient()
  const home = (user.home_region_code ?? '').toUpperCase()
  const homeRegion = regions.find((r) => r.region_code.toUpperCase() === home)
  const homeTitle = homeRegion ? companyTitle(homeRegion) : user.home_region_code
  const role = roleLabel(user.role)

  const save = useMutation({
    mutationFn: () => {
      // Same payload rule as Flutter: no extras → [], else home + extras.
      const extras = [...selected].filter((c) => c !== home)
      const payload = extras.length === 0 ? [] : [...new Set([...(home ? [home] : []), ...extras])]
      return setUserRegions(user.id, payload)
    },
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.user(user.id), updated)
      qc.invalidateQueries({ queryKey: adminKeys.usersAll })
      qc.invalidateQueries({ queryKey: adminKeys.approversAll })
      onSaved()
    },
  })

  function toggle(code: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(code)
      else next.delete(code)
      return next
    })
  }

  const rows: [string, string][] = [
    ['Role', role || '—'],
  ]
  const erpRole = (user.erp_role ?? '').trim()
  if (erpRole && erpRole.toLowerCase() !== role.toLowerCase()) rows.push(['ERP role', erpRole])
  rows.push(['Department', (user.department_name ?? '').trim() || '—'])
  rows.push(['Username', (user.username ?? '').trim() || '—'])
  if ((user.email ?? '').trim()) rows.push(['Email', (user.email ?? '').trim()])
  if (user.employee_id != null) rows.push(['Employee ID', String(user.employee_id)])
  rows.push(['Home company', homeTitle || '—'])
  rows.push(['App access', user.has_app_login ? 'Signed in' : 'Not signed in yet'])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-start gap-4 rounded-2xl border border-brand-divider bg-brand-card p-4">
          <Avatar text={initials(user.display_name)} size="lg" />
          <div>
            <h1 className="text-lg font-extrabold text-brand-text">{user.display_name}</h1>
            <div className="mt-1 text-[13px] font-bold text-brand-darkblue">
              {role || (user.has_app_login ? 'Signed in' : 'ERP employee')}
            </div>
            {user.department_name && <div className="mt-0.5 text-sm text-brand-textmuted">{user.department_name}</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
          <h2 className="mb-2 text-sm font-bold text-brand-text">Details</h2>
          <dl className="divide-y divide-brand-divider text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="text-brand-textmuted">{label}</dt>
                <dd className="text-right font-medium text-brand-text">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-divider bg-brand-card p-4">
        <h2 className="text-[13px] font-bold tracking-wide text-brand-textmuted">Companies</h2>
        <p className="mt-2 text-sm leading-snug text-brand-textmuted">
          {user.has_app_login
            ? 'Home company comes from ERP and stays on. Tick extra companies for a multi-region user — they pick one on each new bill. For an HOD, Accountant or Finance Manager, ticked companies also decide whose bills they approve.'
            : 'This is the ERP employee record. Extra companies can be ticked after they first sign in to the expense app — nothing is copied until then.'}
        </p>
        <ul className="mt-3 divide-y divide-brand-divider">
          {regions.map((r) => {
            const code = r.region_code.toUpperCase()
            const isHome = code === home
            const disabled = !user.has_app_login || isHome
            return (
              <li key={r.id}>
                <label className={`flex items-center gap-3 py-2.5 ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(code) || isHome}
                    disabled={disabled}
                    onChange={(e) => toggle(code, e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-brand-text">{companyTitle(r)}</span>
                    <span className="block text-xs text-brand-textmuted">{isHome ? `${code} · home (ERP)` : code}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        {user.has_app_login && (
          <PrimaryButton className="mt-4 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save companies'}
          </PrimaryButton>
        )}
        {save.error && <p className="mt-2 text-sm text-brand-danger">{errorMessage(save.error)}</p>}
      </div>
    </div>
  )
}
