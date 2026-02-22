import { useCallback } from 'react'

import { useConfig } from '@/hooks/useConfig'
import { useSettings } from '@/hooks/useSettings'
import { settingsSyncProvider } from '@/services/settingsSync.provider'
import { type ExecuteSettingsSyncResult } from '@/services/settingsSync.provider.types'
import { settingsSyncService } from '@/services/settingsSync.service'
import { useAuthStore } from '@/stores/auth.store'

interface UseSettingsSyncResult {
  preview: ReturnType<typeof settingsSyncService.buildPreview>
  draft: ReturnType<typeof settingsSyncService.buildRequestDraft>
  capability: ReturnType<typeof settingsSyncProvider.getCapabilities>
  executeSync: () => Promise<ExecuteSettingsSyncResult>
}

export const useSettingsSync = (): UseSettingsSyncResult => {
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const { analyticsEnabled, notificationsEnabled } = useSettings()

  const capability = settingsSyncProvider.getCapabilities()

  const input = {
    preferences: {
      notificationsEnabled,
      analyticsEnabled
    },
    backendProvider: config.backend.provider,
    hasAdminModule: config.hasAdmin,
    actor: activeUser
      ? {
          id: activeUser.id,
          email: activeUser.email,
          role: activeUser.role
        }
      : null,
    hasRemoteSyncEndpoint: capability.canExecute
  } as const

  const preview = settingsSyncService.buildPreview(input)
  const draft = settingsSyncService.buildRequestDraft(input)

  const executeSync = useCallback(async (): Promise<ExecuteSettingsSyncResult> => {
    return settingsSyncProvider.executeSync({ draft })
  }, [draft])

  return {
    preview,
    draft,
    capability,
    executeSync
  }
}
