import { useState, type ReactNode } from 'react'
import type { IconType } from 'react-icons'
import {
  PiArrowCounterClockwise,
  PiBriefcase,
  PiBuildings,
  PiClockCounterClockwise,
  PiPencilSimple,
  PiPlus,
  PiReceipt,
  PiWallet,
} from 'react-icons/pi'
import { Link } from 'react-router-dom'
import type { RegionConfig, TopupHistoryEntry } from '../../api/adminOrg'
import type { SiteBill, SitePerson, SitePot } from '../../api/sitePca'
import { ClaimRef } from '../../components/ClaimRef'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { StatusChip } from '../../components/StatusChip'
import { formatMoney } from '../../lib/money'
import { approverInitials, companyTitle, errorMessage } from '../admin/adminHelpers'
import { Avatar, OutlineButton, PrimaryButton } from '../admin/AdminUi'
import { PrepareTopupDialog, SetPettyCashDialog } from './SitePcaDialogs'
import { SiteNotice, SiteTopupCard } from './SiteTopupsPanel'
import {
  amountToTopUp,
  billDetails,
  billLink,
  billTitle,
  canPrepareTopup,
  canSetPettyCash,
  isPositive,
  leftShare,
  longDateTime,
  requestEmployeeId,
  shareColor,
  useSiteEmployeeBills,
  useSitePots,
  useSiteSets,
  useSiteTopups,
} from './sitePcaHelpers'

type Dialog = { kind: 'set'; pot: SitePot | null } | { kind: 'topup'; pot: SitePot } | null

/**
 * Port of SiteEmployeeScreen (site_pca_screen.dart): one employee's petty cash -- who they
 * are, their petty cash (set / change it, prepare a top-up), their bills, their top-ups and
 * every change to the amount.
 */
export function SiteEmployeeView({
  region,
  person,
  role,
  onBack,
}: {
  region: RegionConfig
  person: SitePerson
  role: string | null
  onBack: () => void
}) {
  const canSet = canSetPettyCash(role)
  const canPrepare = canPrepareTopup(role)
  const pots = useSitePots(region.id)
  const bills = useSiteEmployeeBills(region.id, person.id)
  const topupsQuery = useSiteTopups(region.id)
  const sets = useSiteSets(region.id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const pot = (pots.data ?? []).find((p) => p.employee_id === person.id) ?? null
  const topups = (topupsQuery.data ?? []).filter((t) => requestEmployeeId(t) === person.id)
  // Every change to the amount, newest first.
  const changes: TopupHistoryEntry[] = (sets.data ?? [])
    .filter((s) => requestEmployeeId(s) === person.id)
    .flatMap((s) => s.history)
    .sort((a, b) => (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0))

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm font-medium text-brand-darkblue hover:underline">
        ← Employees
      </button>

      <ProfileHeader person={person} region={region} />

      {notice && <SiteNotice text={notice} onClose={() => setNotice(null)} />}

      {pots.isLoading && !pot ? (
        <Panel>
          <LoadingSpinner />
        </Panel>
      ) : pots.error ? (
        <Panel>
          <p className="p-4 text-sm text-brand-danger">{errorMessage(pots.error)}</p>
        </Panel>
      ) : pot ? (
        <PotSummary
          pot={pot}
          canSet={canSet}
          canPrepare={canPrepare}
          onChange={() => setDialog({ kind: 'set', pot })}
          onTopup={() => setDialog({ kind: 'topup', pot })}
        />
      ) : (
        <NoPotPanel canSet={canSet} onSet={() => setDialog({ kind: 'set', pot: null })} />
      )}

      <section>
        <SectionTitle icon={PiReceipt} title="Bills" count={bills.data?.length} />
        {bills.isLoading ? (
          <Panel>
            <LoadingSpinner />
          </Panel>
        ) : bills.error ? (
          <Panel>
            <p className="p-4 text-sm text-brand-danger">{errorMessage(bills.error)}</p>
          </Panel>
        ) : (bills.data ?? []).length === 0 ? (
          <EmptyPanel icon={PiReceipt} text="No bills submitted yet." />
        ) : (
          <Panel>
            <ul className="divide-y divide-brand-divider">
              {(bills.data ?? []).map((b) => (
                <li key={b.id}>
                  <BillRow bill={b} link={billLink(role, b)} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>

      <section>
        <SectionTitle
          icon={PiArrowCounterClockwise}
          title="Top-ups"
          count={topupsQuery.data ? topups.length : undefined}
        />
        {topupsQuery.isLoading ? (
          <Panel>
            <LoadingSpinner />
          </Panel>
        ) : topupsQuery.error ? (
          <Panel>
            <p className="p-4 text-sm text-brand-danger">{errorMessage(topupsQuery.error)}</p>
          </Panel>
        ) : topups.length === 0 ? (
          <EmptyPanel
            icon={PiArrowCounterClockwise}
            text="No top-ups yet. The Accountant prepares one from approved petty-cash bills."
          />
        ) : (
          <div className="space-y-3">
            {topups.map((t) => (
              <SiteTopupCard key={t.id} request={t} role={role} onDone={setNotice} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          icon={PiClockCounterClockwise}
          title="Petty cash changes"
          count={sets.data ? changes.length : undefined}
        />
        {sets.error ? (
          <Panel>
            <p className="p-4 text-sm text-brand-danger">{errorMessage(sets.error)}</p>
          </Panel>
        ) : changes.length === 0 ? (
          <EmptyPanel icon={PiClockCounterClockwise} text="No changes to the amount yet." />
        ) : (
          <Panel>
            <ol className="py-1.5">
              {changes.map((entry, i) => (
                <ChangeRow key={i} entry={entry} last={i === changes.length - 1} />
              ))}
            </ol>
          </Panel>
        )}
      </section>

      {dialog?.kind === 'set' && (
        <SetPettyCashDialog
          region={region}
          pot={dialog.pot}
          employee={dialog.pot ? null : person}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'topup' && (
        <PrepareTopupDialog
          pot={dialog.pot}
          onClose={() => setDialog(null)}
          onDone={() => setNotice('Top-up sent to the Head of Accountant.')}
        />
      )}
    </div>
  )
}

/** White rounded panel used by every block on the employee page. */
function Panel({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-brand-divider bg-brand-card">{children}</div>
}

function ProfileHeader({ person, region }: { person: SitePerson; region: RegionConfig }) {
  const name = person.display_name.trim()
  const company = companyTitle(region).trim()
  return (
    <Panel>
      <div className="flex items-center gap-3.5 p-4">
        <Avatar text={approverInitials(name)} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-lg font-extrabold leading-tight text-brand-text">{name || 'Employee'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {person.department_name && <Tag icon={PiBriefcase} text={person.department_name} />}
            {company && <Tag icon={PiBuildings} text={company} />}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Tag({ icon: Icon, text }: { icon: IconType; text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-background px-2 py-0.5 text-xs text-brand-textmuted">
      <Icon className="shrink-0" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </span>
  )
}

/** Available against the amount, the three running figures, and change / top-up buttons. */
function PotSummary({
  pot,
  canSet,
  canPrepare,
  onChange,
  onTopup,
}: {
  pot: SitePot
  canSet: boolean
  canPrepare: boolean
  onChange: () => void
  onTopup: () => void
}) {
  const share = leftShare(pot)
  const color = shareColor(share)
  const toTopUp = amountToTopUp(pot)
  const pendingBills = pot.pending_bills ?? 0
  const pendingTopup = pot.pending_topup ?? 0
  return (
    <Panel>
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <PiWallet className="text-lg text-brand-darkblue" aria-hidden="true" />
          <span className="flex-1 font-bold text-brand-darkblue">Petty cash</span>
          <span className={`text-[12.5px] font-bold ${color.text}`}>{Math.round(share * 100)}% left</span>
        </div>
        <div className="mt-3 text-[12.5px] text-brand-textmuted">Available</div>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-[26px] font-extrabold text-brand-text">{formatMoney(pot.available ?? 0, pot.currency)}</span>
          <span className="text-[12.5px] text-brand-textmuted">of {formatMoney(pot.approved_limit, pot.currency)}</span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-md bg-brand-background">
          <div className={`h-full ${color.bar}`} style={{ width: `${share * 100}%` }} />
        </div>
        <div className="mt-3.5 grid grid-cols-3 gap-3">
          <Figure label="Spent" value={formatMoney(pot.spent ?? 0, pot.currency)} />
          <Figure label="In approval" value={formatMoney(pendingBills, pot.currency)} highlight={pendingBills > 0} />
          <Figure label="Top-up on way" value={formatMoney(pendingTopup, pot.currency)} highlight={pendingTopup > 0} />
        </div>
        {canSet && (
          <div className="mt-4 flex flex-wrap gap-2.5 border-t border-brand-divider pt-3">
            <OutlineButton onClick={onChange} className="inline-flex items-center gap-1.5">
              <PiPencilSimple aria-hidden="true" /> Change amount
            </OutlineButton>
            {canPrepare && isPositive(toTopUp) && (
              <PrimaryButton onClick={onTopup} className="inline-flex items-center gap-1.5">
                <PiArrowCounterClockwise aria-hidden="true" /> Top up {formatMoney(toTopUp, pot.currency)}
              </PrimaryButton>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}

function Figure({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] text-brand-textmuted">{label}</div>
      <div className={`truncate text-[13.5px] font-bold ${highlight ? 'text-brand-orange' : 'text-brand-text'}`}>{value}</div>
    </div>
  )
}

function NoPotPanel({ canSet, onSet }: { canSet: boolean; onSet: () => void }) {
  return (
    <Panel>
      <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-warningsoft">
          <PiWallet className="text-2xl text-brand-orange" aria-hidden="true" />
        </span>
        <div className="mt-3 text-base font-extrabold text-brand-text">No petty cash yet</div>
        <p className="mt-1 text-[13px] leading-snug text-brand-textmuted">
          {canSet
            ? 'Give them petty cash for all their sites. It is live as soon as you save.'
            : 'The Accountant sets it. Until then their bills are reimbursements.'}
        </p>
        {canSet && (
          <PrimaryButton onClick={onSet} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 py-2.5">
            <PiPlus aria-hidden="true" /> Set petty cash
          </PrimaryButton>
        )}
      </div>
    </Panel>
  )
}

function SectionTitle({ icon: Icon, title, count }: { icon: IconType; title: string; count?: number }) {
  return (
    <h2 className="mb-2 ml-1 flex items-center gap-1.5 text-[15px] font-extrabold text-brand-darkblue">
      <Icon aria-hidden="true" />
      {title}
      {count != null && count > 0 && (
        <span className="rounded-full bg-brand-lightblue px-2 py-px text-[11.5px] font-bold">{count}</span>
      )}
    </h2>
  )
}

function EmptyPanel({ icon: Icon, text }: { icon: IconType; text: string }) {
  return (
    <Panel>
      <div className="flex items-center gap-3 px-4 py-4">
        <Icon className="shrink-0 text-xl text-brand-divider" aria-hidden="true" />
        <p className="text-[13px] leading-snug text-brand-textmuted">{text}</p>
      </div>
    </Panel>
  )
}

/** One change to the amount, as a small timeline row. */
function ChangeRow({ entry: h, last }: { entry: TopupHistoryEntry; last: boolean }) {
  const meta = [h.actor_name, longDateTime(h.at)].filter((s): s is string => !!s).join(' · ')
  return (
    <li className="flex">
      <span className="flex w-9 shrink-0 flex-col items-center">
        <span className="mt-3.5 h-[9px] w-[9px] rounded-full bg-brand-darkblue" />
        {!last && <span className="w-[1.5px] flex-1 bg-brand-divider" />}
      </span>
      <div className="py-2 pr-4">
        <div className="text-[13.5px] font-semibold text-brand-text">{h.comment && h.comment.trim() ? h.comment : h.action}</div>
        {meta && <div className="text-xs text-brand-textmuted">{meta}</div>}
      </div>
    </li>
  )
}

function BillRow({ bill: b, link }: { bill: SiteBill; link: string | null }) {
  const pettyCash = b.type === 'petty_cash'
  const Icon = pettyCash ? PiWallet : PiReceipt
  const content = (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
          pettyCash ? 'bg-brand-warningsoft text-brand-orange' : 'bg-brand-lightblue text-brand-darkblue'
        }`}
      >
        <Icon className="text-lg" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-brand-text">{billTitle(b)}</span>
        <span className="block truncate text-xs text-brand-textmuted">{billDetails(b)}</span>
        <span className="mt-0.5 block text-xs">
          <ClaimRef id={b.id} billNumber={b.bill_number} />
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-extrabold text-brand-text">{formatMoney(b.total_amount ?? b.amount, b.currency)}</span>
        <StatusChip status={b.status} />
      </span>
    </>
  )
  const cls = 'flex items-center gap-3 px-3.5 py-3'
  return link ? (
    <Link to={link} className={`${cls} hover:bg-brand-background`}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  )
}
