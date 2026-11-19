import { useQuery } from '@tanstack/react-query'
import { readingsApi } from '../../lib/api/readings'
import { isGuestMode, useAuth } from '../../lib/auth'

export function useReadingEditions() {
  const userId = useAuth((state) => state.user?.id)
  return useQuery({
    queryKey: ['reading-editions', userId],
    queryFn: readingsApi.list,
    enabled: !!userId && !isGuestMode(),
    staleTime: 60 * 60 * 1000,
  })
}
