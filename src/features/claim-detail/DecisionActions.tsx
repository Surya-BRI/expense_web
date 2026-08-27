import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { ErrorBanner } from '../../components/ErrorBanner'
import { useDecisionMutation } from './useDecisionMutation'

export function DecisionActions({
  claimId,
  stage,
  onDecided,
}: {
  claimId: number
  stage: string
  onDecided: () => void
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useDecisionMutation(claimId, stage)
  const navigate = useNavigate()

  function submit(action: 'approve' | 'dispute' | 'reject') {
    setError(null)
    // Backend requires a non-empty comment for dispute/reject; validate client-side too.
    if (action !== 'approve' && comment.trim().length === 0) {
      setError('A comment is required to dispute or reject a claim.')
      return
    }
    mutation.mutate(
      { action, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          onDecided()
          navigate(`/queue/${stage}`)
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Failed to submit decision.')
        },
      },
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-brand-divider bg-brand-card p-4">
      <label htmlFor="comment" className="block text-sm font-medium text-brand-text">
        Comment (required for dispute/reject)
      </label>
      <textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-brand-divider px-3 py-2 text-sm focus:border-brand-darkblue focus:outline-none"
      />

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => submit('approve')}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={mutation.isPending || comment.trim().length === 0}
          onClick={() => submit('dispute')}
          title="Send back to employee"
          className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
        >
          Dispute (send back to employee)
        </button>
        <button
          type="button"
          disabled={mutation.isPending || comment.trim().length === 0}
          onClick={() => submit('reject')}
          className="rounded-md bg-brand-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
