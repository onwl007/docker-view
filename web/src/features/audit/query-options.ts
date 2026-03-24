import { queryOptions } from '@tanstack/react-query'
import { fetchAuditEvents } from '@/lib/api/client'

export const auditEventsQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['audit', 'events', { q: query ?? '' }],
    queryFn: () => fetchAuditEvents({ q: query, limit: 100 }),
    staleTime: 15_000,
    retry: false,
  })
