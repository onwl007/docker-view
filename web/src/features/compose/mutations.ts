import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteComposeProject,
  recreateComposeProject,
  startComposeProject,
  stopComposeProject,
} from '@/lib/api/client'

async function invalidateComposeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  name?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['compose', 'projects'] }),
    queryClient.invalidateQueries({ queryKey: ['system', 'summary'] }),
    ...(name ? [queryClient.invalidateQueries({ queryKey: ['compose', 'projects', name] })] : []),
  ])
}

export function useStartComposeProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => startComposeProject(name),
    onSuccess: async (_, name) => {
      await invalidateComposeQueries(queryClient, name)
    },
  })
}

export function useStopComposeProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => stopComposeProject(name),
    onSuccess: async (_, name) => {
      await invalidateComposeQueries(queryClient, name)
    },
  })
}

export function useRecreateComposeProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => recreateComposeProject(name),
    onSuccess: async (_, name) => {
      await invalidateComposeQueries(queryClient, name)
    },
  })
}

export function useDeleteComposeProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => deleteComposeProject(name),
    onSuccess: async (_, name) => {
      await invalidateComposeQueries(queryClient, name)
    },
  })
}
