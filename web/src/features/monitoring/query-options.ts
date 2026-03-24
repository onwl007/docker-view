import { queryOptions } from '@tanstack/react-query'
import {
  fetchMonitoringContainers,
  fetchMonitoringHost,
} from '@/lib/api/client'

export const monitoringHostQueryOptions = queryOptions({
  queryKey: ['monitoring', 'host'],
  queryFn: fetchMonitoringHost,
  staleTime: 0,
})

export const monitoringContainersQueryOptions = queryOptions({
  queryKey: ['monitoring', 'containers'],
  queryFn: fetchMonitoringContainers,
  staleTime: 0,
})
