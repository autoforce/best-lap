import { useCallback, useMemo } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { normalizePeriod, type PeriodSelection } from '@/lib/period'

type SearchValue = string | number | boolean | undefined

/**
 * Reads and writes the current route's search params, so filters survive reloads
 * and can be shared as links. Empty values are removed from the URL.
 */
export function useSearchState<T extends Record<string, SearchValue>>() {
  const raw = useRouterState({ select: (state) => state.location.search }) as Record<string, unknown>
  // The router parses JSON-looking values (?q=123 becomes a number); screens always get strings
  const search = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key, value === null || value === undefined ? undefined : String(value)])
      ) as T,
    [raw]
  )
  const navigate = useNavigate()

  const setSearch = useCallback(
    (patch: Partial<T>) => {
      navigate({
        to: '.',
        replace: true,
        search: ((prev: Record<string, SearchValue>) => {
          const next: Record<string, SearchValue> = { ...prev, ...patch }
          for (const key of Object.keys(next)) {
            if (next[key] === undefined || next[key] === '') delete next[key]
          }
          return next
        }) as never,
      })
    },
    [navigate]
  )

  return [search, setSearch] as const
}

/** Period selection stored as `?range=30d&gran=daily` */
export function usePeriodSearch() {
  const [search, setSearch] = useSearchState<{ range?: string; gran?: string }>()
  const period = normalizePeriod(search.range, search.gran)

  const setPeriod = useCallback(
    (next: PeriodSelection) => setSearch({ range: next.range, gran: next.granularity }),
    [setSearch]
  )

  return [period, setPeriod] as const
}
