import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approve, dispute, reject } from '../../api/approvals'

export function useDecisionMutation(id: number, stage: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { action: 'approve' | 'dispute' | 'reject'; comment?: string }) => {
      if (input.action === 'approve') return approve(id, input.comment)
      if (input.action === 'dispute') return dispute(id, input.comment ?? '')
      return reject(id, input.comment ?? '')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] })
      queryClient.invalidateQueries({ queryKey: ['queue', stage] })
    },
  })
}
