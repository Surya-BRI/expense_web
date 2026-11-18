import { useState } from 'react'
import { PiCaretLeft, PiCaretRight, PiMagnifyingGlass, PiUsersThree, PiWarningCircle } from 'react-icons/pi'
import type { RegionConfig } from '../../api/adminOrg'
import type { PcaDepartment, PcaMember } from '../../api/pca'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { errorMessage } from '../admin/adminHelpers'
import { inputClass, OutlineButton } from '../admin/AdminUi'
import { Chip, ProgressBar } from './PcaUi'
import { SetPettyCashDialog } from './SetPettyCashDialog'
import { usedShare, usePcaDepartmentEmployees, usePcaDepartments } from './pcaHelpers'

/**
 * Port of PcaDepartmentsView + PcaDepartmentEmployeesScreen (advances_screen.dart): the
 * company's departments (counts and total limit, one light request); opening one lists its
 * employees with their limit, what's left and a usage bar. The HOD (their staff) and Admin set
 * an employee's petty cash from here.
 */
export function PcaDepartmentsPanel({ region }: { region: RegionConfig }) {
  // The opened department, tied to its company so switching company goes back to the list.
  const [open, setOpen] = useState<{ regionId: number; department: PcaDepartment } | null>(null)
  if (open && open.regionId === region.id) {
    return <DepartmentEmployees region={region} department={open.department} onBack={() => setOpen(null)} />
  }
  return <DepartmentList region={region} onOpen={(department) => setOpen({ regionId: region.id, department })} />
}

function DepartmentList({ region, onOpen }: { region: RegionConfig; onOpen: (d: PcaDepartment) => void }) {
  const { data, isLoading, error } = usePcaDepartments(region.id)
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load departments.')} />
  if (!data || data.departments.length === 0) {
    return <p className="py-8 text-center text-sm text-brand-textmuted">No employees.</p>
  }
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">
      {data.departments.map((d) => (
        <button
          key={d.department_id}
          type="button"
          onClick={() => onOpen(d)}
          className="flex items-center gap-3 rounded-2xl border border-brand-divider bg-brand-card py-3.5 pl-3.5 pr-2.5 text-left hover:bg-brand-background"
        >
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-lightblue text-brand-darkblue">
            <PiUsersThree size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-extrabold text-brand-darkblue">{d.department_name}</span>
            <span className="mt-0.5 block text-[12.5px] text-brand-textmuted">
              {d.employee_count} employee{d.employee_count === 1 ? '' : 's'} · {d.with_petty_cash} with petty cash
            </span>
            {d.not_set > 0 && <span className="mt-1 block text-xs font-bold text-brand-orange">{d.not_set} not set</span>}
          </span>
          <span className="text-right">
            <span className="block text-[13.5px] font-extrabold text-brand-text">{formatMoney(d.total_limit, data.currency)}</span>
            <span className="block text-[11px] text-brand-textmuted">total limit</span>
          </span>
          <PiCaretRight size={18} className="shrink-0 text-brand-textmuted" />
        </button>
      ))}
    </div>
  )
}

function DepartmentEmployees({
  region,
  department,
  onBack,
}: {
  region: RegionConfig
  department: PcaDepartment
  onBack: () => void
}) {
  const { user } = useAuth()
  const canSet = user?.role === 'hod' || user?.role === 'admin'
  const { data, isLoading, error } = usePcaDepartmentEmployees(region.id, department.department_id)
  const [notSetOnly, setNotSetOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [setting, setSetting] = useState<PcaMember | null>(null)

  const employees = data?.employees ?? []
  const notSet = employees.filter((m) => m.advance <= 0).length
  const q = query.trim().toLowerCase()
  const people = employees.filter(
    (m) => (!notSetOnly || m.advance <= 0) && (q.length === 0 || (m.employee_name ?? '').toLowerCase().includes(q)),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <OutlineButton onClick={onBack} className="inline-flex items-center gap-1">
          <PiCaretLeft size={14} />
          Departments
        </OutlineButton>
        <h2 className="text-base font-extrabold text-brand-darkblue">{department.department_name}</h2>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load employees.')} />}

      {data && (
        <>
          {employees.length > 8 && (
            <div className="relative max-w-sm">
              <PiMagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-textmuted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employee"
                className={`${inputClass} pl-9`}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Chip selected={!notSetOnly} onClick={() => setNotSetOnly(false)}>
              All ({employees.length})
            </Chip>
            {notSet > 0 && (
              <Chip selected={notSetOnly} onClick={() => setNotSetOnly(true)}>
                <PiWarningCircle size={16} className={notSetOnly ? '' : 'text-brand-orange'} />
                Not set ({notSet})
              </Chip>
            )}
          </div>
          {people.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-textmuted">Nobody matches.</p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {people.map((m) => (
                <EmployeeCard
                  key={m.employee_id}
                  member={m}
                  currency={data.currency}
                  onSet={canSet ? () => setSetting(m) : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      {setting && (
        <SetPettyCashDialog region={region} initialEmployeeId={setting.employee_id} onClose={() => setSetting(null)} />
      )}
    </div>
  )
}

/** _EmployeeCard: limit, spent, what's left and a usage bar; "Not set" people get a Set button. */
function EmployeeCard({ member: m, currency, onSet }: { member: PcaMember; currency: string; onSet?: () => void }) {
  const isSet = m.advance > 0
  const used = isSet ? usedShare(m.advance - m.available, m.advance) : 0
  const name = (m.employee_name ?? 'Employee').trim()
  const initial = name.length === 0 ? '?' : name[0].toUpperCase()
  const extras = [
    m.unreplenished_spend > 0 ? `to top up ${formatMoney(m.unreplenished_spend, currency)}` : null,
    m.pending_bills > 0 ? `in approval ${formatMoney(m.pending_bills, currency)}` : null,
  ].filter((s): s is string => !!s)

  const body = (
    <>
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-extrabold ${
          isSet ? 'bg-brand-lightblue text-brand-darkblue' : 'bg-brand-warningsoft text-brand-orange'
        }`}
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold text-brand-text">{name}</span>
        {isSet ? (
          <>
            <span className="mt-0.5 block text-xs text-brand-textmuted">
              limit {formatMoney(m.advance, currency)} · spent {formatMoney(m.spent, currency)}
            </span>
            {extras.length > 0 && <span className="block text-xs text-brand-textmuted">{extras.join(' · ')}</span>}
            <span className="mt-1.5 block">
              <ProgressBar value={used} colorClass={used >= 0.5 ? 'bg-brand-orange' : 'bg-brand-success'} />
            </span>
          </>
        ) : (
          <span className="mt-0.5 block text-xs text-brand-textmuted">
            {m.advance_waiting > 0
              ? `Waiting: ${formatMoney(m.advance_waiting, currency)} proposed`
              : 'No petty cash · bills go as reimbursements'}
          </span>
        )}
      </span>
      {isSet ? (
        <span className="shrink-0 text-right">
          <span className={`block text-sm font-extrabold ${used >= 0.5 ? 'text-brand-orange' : 'text-brand-darkblue'}`}>
            {formatMoney(m.available, currency)}
          </span>
          <span className="block text-[11px] text-brand-textmuted">left</span>
        </span>
      ) : onSet ? (
        <span className="shrink-0 rounded-md border border-brand-orange px-3.5 py-1 text-sm font-semibold text-brand-orange">
          Set
        </span>
      ) : (
        <span className="shrink-0 font-extrabold text-brand-orange">Not set</span>
      )}
    </>
  )

  const frame = `flex w-full items-center gap-3 rounded-xl border bg-brand-card p-3 text-left ${
    isSet ? 'border-brand-divider' : 'border-brand-orange/45'
  }`
  return onSet ? (
    <button type="button" onClick={onSet} className={`${frame} hover:bg-brand-background`}>
      {body}
    </button>
  ) : (
    <div className={frame}>{body}</div>
  )
}
