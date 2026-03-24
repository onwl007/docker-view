import { queryOptions } from '@tanstack/react-query'
import { fetchComposeProject, fetchComposeProjects } from '@/lib/api/client'

export const composeProjectsQueryOptions = (query?: string) =>
  queryOptions({
    queryKey: ['compose', 'projects', { q: query ?? '' }],
    queryFn: () => fetchComposeProjects(query),
    staleTime: 30_000,
    retry: false,
  })

export const composeProjectDetailQueryOptions = (name: string) =>
  queryOptions({
    queryKey: ['compose', 'projects', name],
    queryFn: () => fetchComposeProject(name),
    staleTime: 30_000,
    retry: false,
  })
