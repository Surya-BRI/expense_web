import type { HistoryItem } from '../../api/types'
import { stageLabel } from '../../lib/stageLabels'

export function HistoryTimeline({ history }: { history: HistoryItem[] | undefined }) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-brand-textmuted">None</p>
  }

  return (
    <ol className="space-y-3">
      {history.map((h) => (
        <li key={h.id} className="border-l-2 border-brand-divider pl-3 text-sm">
          <p className="font-medium capitalize text-brand-text">
            {stageLabel(h.stage)} <span className="font-normal text-brand-textmuted">· {h.action}</span>
          </p>
          {h.remarks && <p className="text-brand-textmuted">{h.remarks}</p>}
          <p className="text-xs text-brand-textmuted">{new Date(h.created_at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  )
}
