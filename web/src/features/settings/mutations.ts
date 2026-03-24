import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveSettings,
  validateSettings,
  type SettingsState,
} from '@/lib/api/client'

export function useValidateSettingsMutation() {
  return useMutation({
    mutationFn: (settings: SettingsState) => validateSettings(settings),
  })
}

export function useSaveSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: SettingsState) => saveSettings(settings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
