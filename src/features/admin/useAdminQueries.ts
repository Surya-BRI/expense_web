import { useQuery, type QueryClient } from '@tanstack/react-query'
import {
  fetchAdminUser,
  fetchAdminUsers,
  fetchDepartmentFunds,
  fetchRegionApprovers,
  fetchTopups,
  listRegions,
} from '../../api/adminOrg'
import { sortRegions } from './adminHelpers'

export const adminKeys = {
  regions: ['admin-regions'] as const,
  departmentFunds: (regionId: number) => ['admin-department-funds', regionId] as const,
  departmentFundsAll: ['admin-department-funds'] as const,
  adminFunds: ['admin-funds'] as const,
  topups: ['topups'] as const,
  replenishableBills: (fundId: number | null) => ['replenishable-bills', fundId] as const,
  replenishableBillsAll: ['replenishable-bills'] as const,
  approvers: (regionId: number) => ['admin-region-approvers', regionId] as const,
  approversAll: ['admin-region-approvers'] as const,
  users: (regionCode: string | null, q: string, offset: number) => ['admin-users', regionCode, q, offset] as const,
  usersAll: ['admin-users'] as const,
  user: (id: number) => ['admin-user', id] as const,
}

export function useAdminRegions() {
  return useQuery({
    queryKey: adminKeys.regions,
    queryFn: async () => sortRegions(await listRegions()),
  })
}

export function useDepartmentFunds(regionId: number, enabled = true) {
  return useQuery({
    queryKey: adminKeys.departmentFunds(regionId),
    queryFn: () => fetchDepartmentFunds(regionId),
    enabled,
  })
}

export function useTopups() {
  return useQuery({ queryKey: adminKeys.topups, queryFn: () => fetchTopups() })
}

export function useRegionApprovers(regionId: number) {
  return useQuery({
    queryKey: adminKeys.approvers(regionId),
    queryFn: () => fetchRegionApprovers(regionId),
  })
}

export const PEOPLE_PAGE_SIZE = 100

export function useAdminUsers(regionCode: string | null, q: string, page: number) {
  const offset = page * PEOPLE_PAGE_SIZE
  return useQuery({
    queryKey: adminKeys.users(regionCode, q, offset),
    queryFn: () => fetchAdminUsers({ regionCode, q, limit: PEOPLE_PAGE_SIZE, offset }),
    placeholderData: (prev) => prev,
  })
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: () => fetchAdminUser(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/** Same set as invalidateFundProviders() in topups_screen.dart. */
export function invalidateFunds(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: adminKeys.topups })
  qc.invalidateQueries({ queryKey: adminKeys.adminFunds })
  qc.invalidateQueries({ queryKey: adminKeys.departmentFundsAll })
  qc.invalidateQueries({ queryKey: adminKeys.replenishableBillsAll })
  qc.invalidateQueries({ queryKey: ['my-funds'] })
}
