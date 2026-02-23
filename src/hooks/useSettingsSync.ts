import { useCallback } from 'react'

import { useConfig } from '@/hooks/useConfig'
import { useSettings } from '@/hooks/useSettings'
import { SESSION_REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY } from '@/services/auth.constants'
import { settingsSyncProvider } from '@/services/settingsSync.provider'
import {
  SettingsSyncProviderError,
  type ExecuteSettingsSyncResult
} from '@/services/settingsSync.provider.types'
import { settingsSyncService } from '@/services/settingsSync.service'
import { storageService } from '@/services/storage.service'
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
  const accessToken = useAuthStore((state) => state.token)
  const setSession = useAuthStore((state) => state.setSession)
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
    if (!capability.canExecute) {
      throw new SettingsSyncProviderError(capability.detail, 'NOT_SUPPORTED')
    }

    const refreshToken = await storageService.getSecureItem(SESSION_REFRESH_TOKEN_KEY)
    const result = await settingsSyncProvider.executeSync({
      draft,
      accessToken,
      refreshToken
    })

    if (result.rotatedSession) {
      await storageService.setSecureItem(SESSION_TOKEN_KEY, result.rotatedSession.token)

      if (typeof result.rotatedSession.refreshToken === 'string' && result.rotatedSession.refreshToken.length > 0) {
        await storageService.setSecureItem(SESSION_REFRESH_TOKEN_KEY, result.rotatedSession.refreshToken)
      } else if (result.rotatedSession.refreshToken === null) {
        await storageService.removeSecureItem(SESSION_REFRESH_TOKEN_KEY)
      }

      if (activeUser) {
        setSession(activeUser, result.rotatedSession.token)
      }
    }

    return result
  }, [accessToken, activeUser, capability.canExecute, capability.detail, draft, setSession])

  return {
    preview,
    draft,
    capability,
    executeSync
  }
}
