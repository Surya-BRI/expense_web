import { Link } from 'react-router-dom'
import type { RegionApprover, RegionConfig } from '../../api/adminOrg'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { approverInitials, companyTitle, errorMessage } from './adminHelpers'
import { Avatar } from './AdminUi'
import { useRegionApprovers } from './useAdminQueries'

const NO_DEPT = 'No department'

/** "Approvers" tab of admin_company_screen.dart: who approves this company's bills. */
export function ApproversTab({ region }: { region: RegionConfig }) {
  const { data, isLoading, error } = useRegionApprovers(region.id)
  const company = companyTitle(region)

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={errorMessage(error, 'Failed to load approvers.')} />
  const roles = data?.roles

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-brand-lightblue p-4">
        <div className="text-[15px] font-extrabold text-brand-text">Who approves {company} bills</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-brand-textmuted">
          Home = this is their own company (from ERP).
          <br />
          Added by Admin = you ticked this company for them under People.
          <br />
          To add or remove someone, open{' '}
          <Link to="/admin/people" className="font-semibold text-brand-darkblue underline">
            People
          </Link>{' '}
          → that person → Companies.
        </p>
      </div>

      <ApproverSection
        title="1. Department HOD"
        subtitle="Approves bills from their own department. IT items on a Sales bill go to the IT HOD after Sales."
        emptyText={`No HOD for ${company} — those bills go to Admin.`}
        people={roles?.hod ?? []}
        company={company}
        groupByDepartment
        why={(p) => {
          const dept = (p.department_name ?? '').trim()
          return dept.length === 0 ? 'Approves department bills' : `Approves ${dept} bills`
        }}
      />
      <ApproverSection
        title="2. Accountant"
        subtitle="Checks every bill for this company after the HODs."
        emptyText={`No Accountant for ${company} — those bills go to Admin.`}
        people={roles?.accountant ?? []}
        company={company}
        why={() => `Checks all ${company} bills`}
      />
      <ApproverSection
        title="3. Finance Manager"
        subtitle="Final approval. Petty cash is deducted here. Reimbursements then wait for payment."
        emptyText={`No Finance Manager for ${company} — those bills go to Admin.`}
        people={roles?.finance_manager ?? []}
        company={company}
        why={() => `Final approval for ${company}`}
      />
    </div>
  )
}

function ApproverSection({
  title,
  subtitle,
  emptyText,
  people,
  company,
  why,
  groupByDepartment = false,
}: {
  title: string
  subtitle: string
  emptyText: string
  people: RegionApprover[]
  company: string
  why: (p: RegionApprover) => string
  groupByDepartment?: boolean
}) {
  const groups = new Map<string, RegionApprover[]>()
  for (const p of people) {
    const key = groupByDepartment ? (p.department_name ?? '').trim() || NO_DEPT : ''
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === NO_DEPT) return 1
    if (b === NO_DEPT) return -1
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })

  return (
    <section>
      <h2 className="text-base font-extrabold text-brand-text">{title}</h2>
      <p className="mt-1 text-[12.5px] text-brand-textmuted">{subtitle}</p>
      <div className="mt-2.5">
        {people.length === 0 ? (
          <div className="rounded-xl bg-brand-warningsoft p-3 text-sm text-brand-text">{emptyText}</div>
        ) : (
          keys.map((key) => (
            <div key={key || 'all'} className="mb-2">
              {key && <div className="mb-1.5 mt-1 text-[13px] font-bold text-brand-darkblue">{key}</div>}
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {groups.get(key)!.map((p) => (
                  <ApproverCard key={p.id} person={p} why={why(p)} company={company} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function ApproverCard({ person, why, company }: { person: RegionApprover; why: string; company: string }) {
  const home = person.home_region
  return (
    <Link
      to={`/admin/people/${person.id}`}
      className="flex items-start gap-3 rounded-xl border border-brand-divider bg-brand-card px-3.5 py-3 hover:border-brand-darkblue"
    >
      <Avatar text={approverInitials(person.display_name ?? '')} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-extrabold text-brand-text">{person.display_name}</div>
        <div className="mt-0.5 text-[12.5px] text-brand-textmuted">{why}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
              home ? 'bg-brand-lightblue text-brand-darkblue' : 'bg-brand-warningsoft text-brand-orange'
            }`}
          >
            {home ? 'Home' : 'Added by Admin'}
          </span>
          <span className="text-xs text-brand-textmuted">
            {home ? 'This is their company' : `You ticked ${company} for them`}
          </span>
        </div>
      </div>
    </Link>
  )
}
