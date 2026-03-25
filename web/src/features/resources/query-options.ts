import { queryOptions } from '@tanstack/react-query'
import {
  fetchContainers,
  fetchImageDetail,
  fetchImages,
  fetchNetworkDetail,
  fetchNetworks,
  fetchVolumeDetail,
  fetchVolumeFileContent,
  fetchVolumeFiles,
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

export const imageDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['images', 'detail', id],
    queryFn: () => fetchImageDetail(id),
    staleTime: 30_000,
    retry: false,
    enabled: Boolean(id),
  })

export const volumesQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['volumes', { q: query ?? '' }],
    queryFn: () => fetchVolumes(query),
    staleTime: 30_000,
    retry: false,
  })

export const volumeDetailQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ['volumes', 'detail', name],
    queryFn: () => fetchVolumeDetail(name),
    staleTime: 30_000,
    retry: false,
    enabled: Boolean(name),
  })

export const volumeFilesQueryOptions = (name: string, currentPath: string) =>
  queryOptions({
    queryKey: ['volumes', 'files', name, currentPath],
    queryFn: () => fetchVolumeFiles(name, currentPath),
    staleTime: 10_000,
    retry: false,
    enabled: Boolean(name),
  })

export const volumeFileContentQueryOptions = (name: string, filePath: string) =>
  queryOptions({
    queryKey: ['volumes', 'file', name, filePath],
    queryFn: () => fetchVolumeFileContent(name, filePath),
    staleTime: 10_000,
    retry: false,
    enabled: Boolean(name && filePath),
  })

export const networksQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['networks', { q: query ?? '' }],
    queryFn: () => fetchNetworks(query),
    staleTime: 30_000,
    retry: false,
  })

export const networkDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['networks', 'detail', id],
    queryFn: () => fetchNetworkDetail(id),
    staleTime: 30_000,
    retry: false,
    enabled: Boolean(id),
  })
