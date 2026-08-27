import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { bulkApprove } from '../../api/approvals'
import type { SkipReason } from '../../api/types'

const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  not_found: 'not found',
  not_awaiting_approval: 'not awaiting approval',
  not_your_stage: 'not at your approval stage',
  duplicate_flagged: 'flagged as a possible duplicate',
  vendor_unresolved: 'vendor needs to be resolved first',
  over_bulk_threshold: 'amount exceeds the bulk-approve threshold',
}

export function BulkApproveBar({
  stage,
  selectedIds,
  onCleared,
}: {
  stage: string
  selectedIds: number[]
  onCleared: () => void
}) {
  const [skipped, setSkipped] = useState<{ id: number; reason: SkipReason }[]>([])
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => bulkApprove(selectedIds),
    onSuccess: (result) => {
      setSkipped(result.skipped)
      queryClient.invalidateQueries({ queryKey: ['queue', stage] })
      onCleared()
    },
  })

  if (selectedIds.length === 0 && skipped.length === 0) return null

  return (
    <div className="space-y-2">
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-brand-divider bg-brand-card px-4 py-2">
          <span className="text-sm text-brand-text">{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-md bg-brand-darkblue px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? 'Approving…' : 'Bulk approve'}
          </button>
        </div>
      )}
      {skipped.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">{skipped.length} claim(s) were skipped:</p>
          <ul className="mt-1 list-disc pl-5">
            {skipped.map((s) => (
              <li key={s.id}>
                #{s.id} — {SKIP_REASON_LABEL[s.reason]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
