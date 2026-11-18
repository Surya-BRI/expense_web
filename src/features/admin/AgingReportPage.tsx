import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchAgingReport, type AgingItem } from '../../api/sla'
import { ClaimRef } from '../../components/ClaimRef'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { formatMoney } from '../../lib/money'
import { companyTitle, errorMessage } from './adminHelpers'
import { useAdminRegions } from './useAdminQueries'

const STATUS: Record<string, { label: string; style: string }> = {
  on_time: { label: 'On time', style: 'bg-brand-successsoft text-brand-success' },
  breached: { label: 'SLA breached', style: 'bg-brand-warningsoft text-brand-orange' },
  escalated: { label: 'Escalated', style: 'bg-red-50 text-brand-danger' },
}

function dueText(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Admin: Aging report (Flutter: aging_report_screen.dart) -- every bill waiting on an approver,
 * most overdue first, with its SLA status (On time / SLA breached / Escalated) and age group.
 */
export function AgingReportPage() {
  const [regionId, setRegionId] = useState<number | null>(null)
  const regions = useAdminRegions()
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['aging-report', regionId],
    queryFn: () => fetchAgingReport(regionId),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-brand-text">Aging report</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={regionId ?? ''}
            onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-md border border-brand-divider bg-brand-card px-3 py-1.5 text-sm text-brand-text"
          >
            <option value="">All companies</option>
            {(regions.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.region_code} · {companyTitle(r)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-md border border-brand-divider bg-brand-card px-3 py-1.5 text-sm font-semibold text-brand-darkblue hover:bg-brand-lightblue disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={errorMessage(error, 'Failed to load the aging report.')} />}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Pending" value={data.summary.pending} style="text-brand-darkblue" />
            <Tile label="SLA breached" value={data.summary.breached} style="text-brand-orange" />
            <Tile label="Escalated" value={data.summary.escalated} style="text-brand-danger" />
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(data.summary.buckets).map(([key, n]) => (
              <span key={key} className="rounded-full bg-brand-lightblue px-3 py-1 text-xs font-semibold text-brand-darkblue">
                {data.bucket_labels[key] ?? key}: {n}
              </span>
            ))}
          </div>

          {data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-brand-textmuted">No bills waiting for approval.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-brand-divider bg-brand-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-background text-xs uppercase text-brand-textmuted">
                  <tr>
                    <th className="px-3 py-2">Claim</th>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">With</th>
                    <th className="px-3 py-2">Waiting</th>
                    <th className="px-3 py-2">Overdue</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <Row key={item.transaction_id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Tile({ label, value, style }: { label: string; value: number; style: string }) {
  return (
    <div className="rounded-xl border border-brand-divider bg-brand-card px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-textmuted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${style}`}>{value}</div>
    </div>
  )
}

function Row({ item }: { item: AgingItem }) {
  const s = STATUS[item.sla_status] ?? { label: item.sla_status, style: 'bg-gray-100 text-brand-textmuted' }
  return (
    <tr className="border-t border-brand-divider align-top">
      <td className="px-3 py-2">
        <ClaimRef id={item.transaction_id} billNumber={null} />
      </td>
      <td className="px-3 py-2 text-brand-text">{item.employee_name ?? '—'}</td>
      <td className="px-3 py-2 text-brand-textmuted">{item.company ?? '—'}</td>
      <td className="px-3 py-2 text-right font-semibold text-brand-text">{formatMoney(item.total_amount, item.currency)}</td>
      <td className="px-3 py-2 text-brand-text">
        <div className="font-medium">{item.stage_label ?? '—'}</div>
        {item.approvers.length > 0 && <div className="text-xs text-brand-textmuted">{item.approvers.join(', ')}</div>}
      </td>
      <td className="px-3 py-2 text-brand-textmuted">{item.waiting_text ?? '—'}</td>
      <td className="px-3 py-2 text-brand-textmuted">
        {item.overdue_text ? (
          <>
            <div className="font-semibold text-brand-danger">{item.overdue_text}</div>
            <div className="text-xs">was due {dueText(item.stage_due_at)}</div>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-3 py-2">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${s.style}`}>{s.label}</span>
      </td>
    </tr>
  )
}
