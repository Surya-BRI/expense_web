import { useQuery } from '@tanstack/react-query'
import { fetchAllClaims } from '../../api/admin'

export function useAdminClaims() {
  return useQuery({ queryKey: ['admin-claims'], queryFn: fetchAllClaims })
}
