import type { HistoryItem } from '../../api/types'
import { stageLabel } from '../../lib/stageLabels'

const ACTION_LABEL: Record<string, string> = {
  submit: 'Submitted',
  submitted: 'Submitted',
  resubmit: 'Resubmitted',
  approve: 'Approved',
  approved: 'Approved',
  dispute: 'Disputed',
  disputed: 'Disputed',
  reject: 'Rejected',
  rejected: 'Rejected',
  paid: 'Paid',
}

export function HistoryTimeline({
  history,
  stageLabels,
}: {
  history: HistoryItem[] | undefined
  /** Stage key -> label with the department ("Department HOD (IT)"), from the claim. */
  stageLabels?: Record<string, string>
}) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-brand-textmuted">None</p>
  }

  return (
    <ol className="space-y-3">
      {history.map((h) => (
        <li key={h.id} className="border-l-2 border-brand-divider pl-3 text-sm">
          <p className="font-medium text-brand-text">
            {stageLabels?.[h.stage] ?? stageLabel((h.stage ?? '').split(':')[0])}{' '}
            <span className="font-normal text-brand-textmuted">· {ACTION_LABEL[h.action] ?? h.action}</span>
          </p>
          {h.remarks && <p className="text-brand-textmuted">{h.remarks}</p>}
          <p className="text-xs text-brand-textmuted">{new Date(h.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  )
}
