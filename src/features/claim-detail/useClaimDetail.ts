import { useQuery } from '@tanstack/react-query'
import { fetchTransaction } from '../../api/approvals'

export function useClaimDetail(id: number) {
  return useQuery({
    queryKey: ['claim', id],
    queryFn: () => fetchTransaction(id),
  })
}
