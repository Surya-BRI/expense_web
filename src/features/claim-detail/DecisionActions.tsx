import { useState } from 'react'
import { PiArrowUUpLeft, PiCheckCircle, PiXCircle } from 'react-icons/pi'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { ErrorBanner } from '../../components/ErrorBanner'
import { landingPathFor } from '../../routing/roleLanding'
import { useDecisionMutation } from './useDecisionMutation'

/**
 * Approve / Dispute / Reject, as on the Flutter review screen (approval_detail_screen.dart):
 * - a department HOD approves only their department's items ("Approve IT items");
 * - at the Accountant stage a duplicate-flagged claim needs a comment to approve too
 *   (the backend enforces this as well).
 */
export function DecisionActions({
  claimId,
  stage,
  departmentName,
  duplicateNeedsJustification,
  journalRequired = false,
  onDecided,
}: {
  claimId: number
  stage: string
  /** Set when a department HOD reviews only their department's part of the bill. */
  departmentName?: string | null
  duplicateNeedsJustification?: boolean
  /** This company books an expense journal at this step (Professional Signs' Accounts Manager):
   * EJV / EJVB and its ERP number are required to approve. */
  journalRequired?: boolean
  onDecided: () => void
}) {
  const [comment, setComment] = useState('')
  const [journalType, setJournalType] = useState<string | null>(null)
  const [journalRef, setJournalRef] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useDecisionMutation(claimId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const hasComment = comment.trim().length > 0
  const journalMissing = journalRequired && (!journalType || journalRef.trim().length === 0)
  const approveBlocked = (!!duplicateNeedsJustification && !hasComment) || journalMissing

  function submit(action: 'approve' | 'dispute' | 'reject') {
    setError(null)
    // Backend requires a non-empty comment for dispute/reject; validate client-side too.
    if (action !== 'approve' && !hasComment) {
      setError('Please add a comment before disputing or rejecting.')
      return
    }
    if (action === 'approve' && journalMissing) {
      setError('Choose the journal (EJV or EJVB) and enter its number from ERP.')
      return
    }
    if (action === 'approve' && approveBlocked) {
      setError('This claim is flagged as a possible duplicate: add a comment explaining why it is fine.')
      return
    }
    mutation.mutate(
      {
        action,
        comment: comment.trim() || undefined,
        journal:
          action === 'approve' && journalRequired && journalType
            ? { journal_type: journalType, journal_reference: journalRef.trim() }
            : null,
      },
      {
        onSuccess: () => {
          onDecided()
          // Back to the user's own queue (a backup may have opened another step's bill).
          navigate(user ? landingPathFor(user.role) : `/queue/${stage}`)
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Failed to submit decision.')
        },
      },
    )
  }

  const approveLabel = journalMissing
    ? 'Approve (enter the journal above)'
    : duplicateNeedsJustification
      ? 'Approve (justify duplicate above)'
      : departmentName
        ? `Approve ${departmentName} items`
        : 'Approve'

  return (
    <div className="space-y-3 rounded-md border border-brand-divider bg-brand-card p-4">
      {journalRequired && (
        // Professional Signs: the Accounts Manager books the expense journal in ERP and records it here.
        <div className="space-y-2 rounded-md bg-brand-background p-3">
          <div className="text-sm font-bold text-brand-text">Expense journal</div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['EJV', 'EJV'],
                ['EJVB', 'EJVB (multi-branch)'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setJournalType(code)}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                  journalType === code
                    ? 'border-brand-darkblue bg-brand-darkblue text-white'
                    : 'border-brand-divider bg-brand-card text-brand-darkblue hover:bg-brand-lightblue'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium text-brand-text">
            Journal number *
            <input
              value={journalRef}
              onChange={(e) => setJournalRef(e.target.value)}
              maxLength={64}
              placeholder="Number from ERP"
              className="mt-1 w-full rounded-md border border-brand-divider bg-brand-card px-3 py-2 text-sm focus:border-brand-darkblue focus:outline-none"
            />
          </label>
        </div>
      )}
      <label htmlFor="comment" className="block text-sm font-medium text-brand-text">
        Comment
      </label>
      <textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Add a note…"
        className="w-full rounded-md border border-brand-divider px-3 py-2 text-sm focus:border-brand-darkblue focus:outline-none"
      />
      <p className="text-xs text-brand-textmuted">
        {duplicateNeedsJustification
          ? '* Required to approve, dispute or reject a duplicate-flagged claim'
          : '* Required to dispute or reject'}
      </p>

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={mutation.isPending || approveBlocked}
          onClick={() => submit('approve')}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-darkblue px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <PiCheckCircle className="h-4 w-4" aria-hidden />
          {approveLabel}
        </button>
        <button
          type="button"
          disabled={mutation.isPending || !hasComment}
          onClick={() => submit('dispute')}
          title="Send back to employee"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <PiArrowUUpLeft className="h-4 w-4" aria-hidden />
          Dispute (send back to employee)
        </button>
        <button
          type="button"
          disabled={mutation.isPending || !hasComment}
          onClick={() => submit('reject')}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-danger px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <PiXCircle className="h-4 w-4" aria-hidden />
          Reject
        </button>
      </div>
    </div>
  )
}
