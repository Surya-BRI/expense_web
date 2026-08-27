import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markPaid } from '../../api/admin'

export function useMarkPaidMutation(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claim', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] })
    },
  })
}
