import { useQuery } from '@tanstack/react-query'
import { readingsApi, type ReadingEdition } from '../../lib/api/readings'
import { isGuestMode, useAuth } from '../../lib/auth'

export function dailyReadingPicks(catalog: ReadingEdition[], date: Date) {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  return catalog.slice(0, 3).map((_, index) => catalog[((day + index) % catalog.length + catalog.length) % catalog.length])
}

export function useReadingEditions() {
  const userId = useAuth((state) => state.user?.id)
  return useQuery({
    queryKey: ['reading-editions', userId],
    queryFn: readingsApi.list,
    enabled: !!userId && !isGuestMode(),
    staleTime: 60 * 60 * 1000,
  })
}
