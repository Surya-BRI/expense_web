import { useMemo, useState } from 'react'
import { PiCaretRight, PiPlus } from 'react-icons/pi'
import { useSearchParams } from 'react-router-dom'
import type { RegionConfig } from '../../api/adminOrg'
import type { SitePerson, SitePot } from '../../api/sitePca'
import type { Role } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { SearchInput } from '../../components/SearchInput'
import { formatMoney } from '../../lib/money'
import { errorMessage } from '../admin/adminHelpers'
import { Avatar, PrimaryButton } from '../admin/AdminUi'
import { SiteEmployeeView } from './SiteEmployeeView'
import { SetPettyCashDialog } from './SitePcaDialogs'
import { canSetPettyCash, firstInitial, leftShare, shareColor, useSitePeople, useSitePots } from './sitePcaHelpers'

/** Search param holding the employee whose page is open (so the browser Back button works). */
const EMPLOYEE_PARAM = 'employee'

/**
 * Port of SitePotsView / _EmployeesList (site_pca_screen.dart): everyone in a site-model
 * company with their petty cash left of its amount, or "Not set"; open one for their petty
 * cash, bills, top-ups and changes. "Set petty cash" for the Accountant, Head of Accountant and
 * Admin. Also Admin's company page tab ("Employees") for that company.
 */
export function SitePotsPanel({ region, role: roleProp }: { region: RegionConfig; role?: Role }) {
  const { user } = useAuth()
  const role = roleProp ?? user?.role ?? null
  const [params, setParams] = useSearchParams()
  const openId = Number(params.get(EMPLOYEE_PARAM))

  const people = useSitePeople(region.id)
  const pots = useSitePots(region.id)

  // Everyone in the company, plus anyone holding petty cash here who isn't any more.
  const rows = useMemo<SitePerson[]>(() => {
    const list = people.data ?? []
    const known = new Set(list.map((p) => p.id))
    const extra = (pots.data ?? []).flatMap((p) =>
      p.employee_id != null && !known.has(p.employee_id)
        ? [{ id: p.employee_id, display_name: p.employee_name ?? 'Employee', department_name: null, advance: p.approved_limit }]
        : [],
    )
    return [...list, ...extra]
  }, [people.data, pots.data])

  function openEmployee(id: number | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id == null) next.delete(EMPLOYEE_PARAM)
        else next.set(EMPLOYEE_PARAM, String(id))
        return next
      },
      { replace: id == null },
    )
  }

  if (Number.isFinite(openId) && openId > 0) {
    const person = rows.find((r) => r.id === openId)
    if (person) {
      return <SiteEmployeeView region={region} person={person} role={role} onBack={() => openEmployee(null)} />
    }
    if (people.data && pots.data) {
      // Not in this company (old link): fall back to the list.
      return <EmployeesList region={region} role={role} rows={rows} pots={pots.data} onOpen={openEmployee} />
    }
  }

  const error = people.error ?? pots.error
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load employees.')} />
  if (!people.data || !pots.data) return <LoadingSpinner />

  return <EmployeesList region={region} role={role} rows={rows} pots={pots.data} onOpen={openEmployee} />
}

function EmployeesList({
  region,
  role,
  rows,
  pots,
  onOpen,
}: {
  region: RegionConfig
  role: string | null
  rows: SitePerson[]
  pots: SitePot[]
  onOpen: (id: number) => void
}) {
  const canSet = canSetPettyCash(role)
  const [search, setSearch] = useState('')
  const [setting, setSetting] = useState(false)

  const potBy = useMemo(() => {
    const map = new Map<number, SitePot>()
    for (const p of pots) if (p.employee_id != null) map.set(p.employee_id, p)
    return map
  }, [pots])

  const q = search.trim().toLowerCase()
  const shown = rows.filter(
    (r) =>
      q.length === 0 || r.display_name.toLowerCase().includes(q) || (r.department_name ?? '').toLowerCase().includes(q),
  )
  const withCash = rows.filter((r) => potBy.has(r.id)).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or department" />
        {canSet && (
          <PrimaryButton onClick={() => setSetting(true)} className="inline-flex items-center gap-1.5">
            <PiPlus aria-hidden="true" /> Set petty cash
          </PrimaryButton>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm leading-snug text-brand-textmuted">
          Nobody belongs to this company yet. In People, set their company or tick it for them.
        </p>
      ) : (
        <>
          <p className="text-[12.5px] text-brand-textmuted">
            {rows.length} employees · {withCash} with petty cash · {rows.length - withCash} not set
          </p>
          <ul className="space-y-2">
            {shown.map((person) => (
              <li key={person.id}>
                <EmployeeRow person={person} pot={potBy.get(person.id) ?? null} onOpen={() => onOpen(person.id)} />
              </li>
            ))}
          </ul>
          {shown.length === 0 && <p className="p-4 text-sm text-brand-textmuted">No one matches.</p>}
        </>
      )}

      {setting && <SetPettyCashDialog region={region} onClose={() => setSetting(false)} />}
    </div>
  )
}

function EmployeeRow({ person, pot, onOpen }: { person: SitePerson; pot: SitePot | null; onOpen: () => void }) {
  const share = pot ? leftShare(pot) : 0
  const color = shareColor(share)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-brand-divider bg-brand-card px-3 py-2.5 text-left hover:bg-brand-background"
    >
      <Avatar text={firstInitial(person.display_name)} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-brand-text">{person.display_name}</span>
        {person.department_name && (
          <span className="block truncate text-[12.5px] text-brand-textmuted">{person.department_name}</span>
        )}
      </span>
      {pot ? (
        <span className="w-32 shrink-0 text-right">
          <span className="block font-extrabold text-brand-darkblue">{formatMoney(pot.available ?? 0, pot.currency)}</span>
          <span className="block text-[12.5px] text-brand-textmuted">of {formatMoney(pot.approved_limit, pot.currency)}</span>
          <span className="mt-1 block h-1 overflow-hidden rounded bg-brand-divider">
            <span className={`block h-full ${color.bar}`} style={{ width: `${share * 100}%` }} />
          </span>
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-brand-divider px-2 py-0.5 text-xs font-semibold text-brand-textmuted">
          Not set
        </span>
      )}
      <PiCaretRight className="shrink-0 text-brand-textmuted" aria-hidden="true" />
    </button>
  )
}
