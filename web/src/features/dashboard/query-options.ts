import { queryOptions } from '@tanstack/react-query'
import { fetchSystemSummary } from '@/lib/api/client'

export const systemSummaryQueryOptions = queryOptions({
  queryKey: ['system', 'summary'],
  queryFn: fetchSystemSummary,
  staleTime: 30_000,
  retry: false,
})
