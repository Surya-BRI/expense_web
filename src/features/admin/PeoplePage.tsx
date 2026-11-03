import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { OrgUser, RegionConfig } from '../../api/adminOrg'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { companyTitle, errorMessage, initials, roleLabel } from './adminHelpers'
import { Avatar, inputClass, OutlineButton } from './AdminUi'
import { PEOPLE_PAGE_SIZE, useAdminRegions, useAdminUsers } from './useAdminQueries'

const ALL = 'all'
const NO_DEPT = 'No department'

/**
 * Port of admin_people_screen.dart (AdminPeopleScreen + AdminCompanyPeopleScreen) as one
 * desktop page: pick a company, search, page through 100 at a time, filter by department.
 * State lives in the URL (?company=&q=&page=) so Back from a person keeps the list.
 */
export function PeoplePage() {
  const [params, setParams] = useSearchParams()
  const { data: regions, isLoading: regionsLoading, error: regionsError } = useAdminRegions()

  const companyParam = (params.get('company') ?? '').toUpperCase()
  const company =
    companyParam === ALL.toUpperCase()
      ? null
      : companyParam || (regions && regions.length > 0 ? regions[0].region_code.toUpperCase() : null)
  const q = params.get('q') ?? ''
  const page = Math.max(0, (Number(params.get('page')) || 1) - 1)
  const ready = !regionsLoading && (companyParam !== '' || regions !== undefined)

  if (regionsError) return <ErrorBanner message={errorMessage(regionsError, 'Failed to load companies.')} />
  if (!ready) return <LoadingSpinner />
  if (regions && regions.length === 0) {
    return <p className="py-8 text-center text-sm text-brand-textmuted">No companies configured</p>
  }

  function update(next: { company?: string | null; q?: string; page?: number }) {
    const out = new URLSearchParams()
    const c = next.company !== undefined ? next.company : company
    out.set('company', c ?? ALL)
    const nq = next.q !== undefined ? next.q : q
    if (nq) out.set('q', nq)
    const np = next.page !== undefined ? next.page : page
    if (np > 0) out.set('page', String(np + 1))
    setParams(out, { replace: true })
  }

  return (
    <PeopleList
      key={`${company}|${q}`}
      regions={regions ?? []}
      company={company}
      q={q}
      page={page}
      onCompany={(c) => update({ company: c, page: 0 })}
      onSearch={(nq) => update({ q: nq, page: 0 })}
      onPage={(p) => update({ page: p })}
    />
  )
}

function PeopleList({
  regions,
  company,
  q,
  page,
  onCompany,
  onSearch,
  onPage,
}: {
  regions: RegionConfig[]
  company: string | null
  q: string
  page: number
  onCompany: (code: string | null) => void
  onSearch: (q: string) => void
  onPage: (page: number) => void
}) {
  const { data, isLoading, isFetching, error } = useAdminUsers(company, q, page)
  const [draft, setDraft] = useState(q)
  const [department, setDepartment] = useState<string | null>(null)
  const navigate = useNavigate()

  const people = useMemo(() => data?.items ?? [], [data])
  const total = data?.total ?? 0
  const pageCount = total <= 0 ? 0 : Math.ceil(total / PEOPLE_PAGE_SIZE)

  // Past the last page (e.g. list shrank): jump back to the last real page, as Flutter does.
  const pastEnd = !!data && total > 0 && page * PEOPLE_PAGE_SIZE >= total
  useEffect(() => {
    if (pastEnd) onPage(Math.floor((total - 1) / PEOPLE_PAGE_SIZE))
  }, [pastEnd, total, onPage])

  const departments = useMemo(() => {
    const names = new Set<string>()
    for (const u of people) {
      const n = (u.department_name ?? '').trim()
      if (n) names.add(n)
    }
    return [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }, [people])

  const groups = useMemo(() => {
    const visible = department === null ? people : people.filter((u) => (u.department_name ?? '').trim() === department)
    const byDept = new Map<string, OrgUser[]>()
    for (const u of visible) {
      const key = (u.department_name ?? '').trim() || NO_DEPT
      byDept.set(key, [...(byDept.get(key) ?? []), u])
    }
    return [...byDept.entries()].sort(([a], [b]) => {
      if (a === NO_DEPT) return 1
      if (b === NO_DEPT) return -1
      return a.toLowerCase().localeCompare(b.toLowerCase())
    })
  }, [people, department])

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    onSearch(draft.trim())
  }

  const from = total === 0 ? 0 : page * PEOPLE_PAGE_SIZE + 1
  const to = page * PEOPLE_PAGE_SIZE + people.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-brand-text">People</h1>
          <select
            aria-label="Company"
            value={company ?? ALL}
            onChange={(e) => onCompany(e.target.value === ALL ? null : e.target.value)}
            className="h-9 rounded-md border border-brand-divider bg-brand-card px-2 text-sm font-semibold text-brand-text"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.region_code.toUpperCase()}>
                {companyTitle(r)}
              </option>
            ))}
            <option value={ALL}>All companies (app users only)</option>
          </select>
        </div>
        <form onSubmit={submitSearch} className="flex w-full max-w-md items-center gap-2">
          <input
            type="search"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (e.target.value.trim() === '' && q) onSearch('')
            }}
            placeholder="Search name, department, or email"
            className={inputClass}
          />
          <OutlineButton type="submit">Search</OutlineButton>
        </form>
      </div>

      {departments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip selected={department === null} onClick={() => setDepartment(null)}>
            All ({people.length})
          </Chip>
          {departments.map((name) => (
            <Chip key={name} selected={department === name} onClick={() => setDepartment(department === name ? null : name)}>
              {name}
            </Chip>
          ))}
        </div>
      )}

      {total > PEOPLE_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <OutlineButton disabled={isFetching || page <= 0} onClick={() => onPage(page - 1)}>
            ‹ Previous
          </OutlineButton>
          <span className="font-bold text-brand-text">{isFetching ? 'Loading…' : `${from}–${to} of ${total}`}</span>
          <OutlineButton disabled={isFetching || page + 1 >= pageCount} onClick={() => onPage(page + 1)}>
            Next ›
          </OutlineButton>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load people.')} />}

      {data && people.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-textmuted">
          {company ? 'No people in this company' : 'No people found'}
        </p>
      )}

      {groups.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-brand-divider bg-brand-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">App access</th>
              </tr>
            </thead>
            {groups.map(([dept, members]) => (
              <tbody key={dept}>
                <tr className="border-t border-brand-divider bg-brand-background/60">
                  <td colSpan={5} className="px-3 py-1.5 text-[13px] font-extrabold text-brand-darkblue">
                    {dept} · {members.length}
                  </td>
                </tr>
                {members.map((u) => (
                  <PersonRow
                    key={u.id}
                    user={u}
                    company={company}
                    onOpen={() => navigate(`/admin/people/${u.id}`)}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        selected
          ? 'border-brand-darkblue bg-brand-lightblue text-brand-darkblue'
          : 'border-brand-divider bg-brand-card text-brand-textmuted hover:text-brand-text'
      }`}
    >
      {children}
    </button>
  )
}

function PersonRow({ user, company, onOpen }: { user: OrgUser; company: string | null; onOpen: () => void }) {
  const homeCode = (user.home_region_code ?? '').toUpperCase()
  const codes = new Set(user.region_codes.map((c) => c.toUpperCase()))
  const multi = codes.size > 1 || (homeCode !== '' && [...codes].some((c) => c !== homeCode))
  const home = company !== null && homeCode === company
  const role = user.has_app_login ? roleLabel(user.role) : ''
  return (
    <tr
      className="cursor-pointer border-t border-brand-divider hover:bg-brand-lightblue/40"
      onClick={onOpen}
    >
      <td className="px-3 py-2">
        <Link
          to={`/admin/people/${user.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-3"
        >
          <Avatar text={initials(user.display_name)} size="sm" />
          <span className="font-extrabold text-brand-text">{user.display_name}</span>
        </Link>
      </td>
      <td className="px-3 py-2 text-brand-textmuted">{role || '—'}</td>
      <td className="px-3 py-2 text-brand-textmuted">{user.email || '—'}</td>
      <td className="px-3 py-2">
        <span className="text-xs font-bold text-brand-darkblue">
          {company === null ? homeCode || '—' : home ? 'Home' : 'Also here'}
        </span>
      </td>
      <td className="px-3 py-2 text-xs font-semibold text-brand-textmuted">
        {user.has_app_login ? (multi ? 'Multi-region' : 'Signed in') : 'ERP only'}
      </td>
    </tr>
  )
}
