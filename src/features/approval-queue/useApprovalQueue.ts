import { useQuery } from '@tanstack/react-query'
import { fetchQueue } from '../../api/approvals'

export function useApprovalQueue(stage: string) {
  return useQuery({
    queryKey: ['queue', stage],
    queryFn: () => fetchQueue(stage),
    enabled: Boolean(stage),
  })
}
