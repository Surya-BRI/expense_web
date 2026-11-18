import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approve, dispute, reject, type Journal } from '../../api/approvals'

// Every queue is refreshed after a decision: a backup's bill can sit in another step's queue.
export function useDecisionMutation(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { action: 'approve' | 'dispute' | 'reject'; comment?: string; journal?: Journal | null }) => {
      if (input.action === 'approve') return approve(id, input.comment, input.journal)
      if (input.action === 'dispute') return dispute(id, input.comment ?? '')
      return reject(id, input.comment ?? '')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] })
      queryClient.invalidateQueries({ queryKey: ['queue'] })
    },
  })
}
