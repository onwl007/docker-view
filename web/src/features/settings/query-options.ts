import { queryOptions } from '@tanstack/react-query'
import { fetchSettings } from '@/lib/api/client'

export const settingsQueryOptions = queryOptions({
  queryKey: ['settings'],
  queryFn: fetchSettings,
})
