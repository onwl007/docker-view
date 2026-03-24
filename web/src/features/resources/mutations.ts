import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createNetwork,
  createVolume,
  deleteContainer,
  deleteImage,
  deleteNetwork,
  deleteVolume,
  pullImage,
  pruneImages,
  restartContainer,
  startContainer,
  stopContainer,
} from '@/lib/api/client'

async function invalidateContainerQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['containers'] }),
    queryClient.invalidateQueries({ queryKey: ['system', 'summary'] }),
  ])
}

async function invalidateOverviewQueries(queryClient: ReturnType<typeof useQueryClient>, key: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [key] }),
    queryClient.invalidateQueries({ queryKey: ['system', 'summary'] }),
  ])
}

export function useStartContainerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => startContainer(id),
    onSuccess: async () => {
      await invalidateContainerQueries(queryClient)
    },
  })
}

export function useStopContainerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, timeoutSeconds }: { id: string; timeoutSeconds?: number }) =>
      stopContainer(id, timeoutSeconds),
    onSuccess: async () => {
      await invalidateContainerQueries(queryClient)
    },
  })
}

export function useRestartContainerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, timeoutSeconds }: { id: string; timeoutSeconds?: number }) =>
      restartContainer(id, timeoutSeconds),
    onSuccess: async () => {
      await invalidateContainerQueries(queryClient)
    },
  })
}

export function useDeleteContainerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      force,
      removeVolumes,
    }: {
      id: string
      force?: boolean
      removeVolumes?: boolean
    }) => deleteContainer(id, { force, removeVolumes }),
    onSuccess: async () => {
      await invalidateContainerQueries(queryClient)
    },
  })
}

export function usePullImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reference: string) => pullImage(reference),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'images')
    },
  })
}

export function useDeleteImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => deleteImage(id, { force }),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'images')
    },
  })
}

export function usePruneImagesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => pruneImages(),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'images')
    },
  })
}

export function useCreateVolumeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createVolume(name),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'volumes')
    },
  })
}

export function useDeleteVolumeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, force }: { name: string; force?: boolean }) => deleteVolume(name, { force }),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'volumes')
    },
  })
}

export function useCreateNetworkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { name: string; driver?: string; internal?: boolean }) => createNetwork(input),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'networks')
    },
  })
}

export function useDeleteNetworkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteNetwork(id),
    onSuccess: async () => {
      await invalidateOverviewQueries(queryClient, 'networks')
    },
  })
}
