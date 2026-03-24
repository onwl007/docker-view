import { queryOptions } from '@tanstack/react-query'
import {
  fetchContainers,
  fetchImages,
  fetchNetworks,
  fetchVolumes,
  type ContainerListFilters,
} from '@/lib/api/client'

export const containersQueryOptions = (filters: ContainerListFilters = {}) =>
  queryOptions({
    queryKey: ['containers', filters],
    queryFn: () => fetchContainers(filters),
    staleTime: 30_000,
    retry: false,
  })

export const recentContainersQueryOptions = queryOptions({
  queryKey: ['containers', 'recent'],
  queryFn: () => fetchContainers({ limit: 5, sort: 'recent', all: true }),
  staleTime: 30_000,
  retry: false,
})

export const imagesQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['images', { q: query ?? '' }],
    queryFn: () => fetchImages(query),
    staleTime: 30_000,
    retry: false,
  })

export const volumesQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['volumes', { q: query ?? '' }],
    queryFn: () => fetchVolumes(query),
    staleTime: 30_000,
    retry: false,
  })

export const networksQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['networks', { q: query ?? '' }],
    queryFn: () => fetchNetworks(query),
    staleTime: 30_000,
    retry: false,
  })
