import {
  SETTINGS_ANALYTICS_ENABLED_KEY,
  SETTINGS_NOTIFICATIONS_ENABLED_KEY
} from '@/services/settings.constants'
import { storageService } from '@/services/storage.service'
import type { BackendProvider, Role } from '@/types/config'

export interface SettingsPreferences {
  notificationsEnabled: boolean
  analyticsEnabled: boolean
}

export interface SettingsSyncPreviewActor {
  id: string
  email: string
  role: Role
}

export interface SettingsSyncPreviewRow {
  key:
    | 'backend-provider'
    | 'sync-endpoint'
    | 'actor'
    | 'notifications'
    | 'analytics'
    | 'admin-module'
  label: string
  value: string
  status: 'ok' | 'warning' | 'neutral'
}

export interface SettingsSyncPreview {
  status: 'ok' | 'warning' | 'neutral'
  summary: string
  nextStep: string
  rows: SettingsSyncPreviewRow[]
}

export interface BuildSettingsSyncPreviewInput {
  preferences: SettingsPreferences
  backendProvider: BackendProvider
  hasAdminModule: boolean
  actor: SettingsSyncPreviewActor | null
  hasRemoteSyncEndpoint: boolean
}

export const defaultSettingsPreferences: SettingsPreferences = {
  notificationsEnabled: true,
  analyticsEnabled: false
}

const parseBooleanSetting = (value: string | null, fallback: boolean): boolean => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return fallback
}

export const settingsService = {
  loadPreferences(): SettingsPreferences {
    return {
      notificationsEnabled: parseBooleanSetting(
        storageService.getItem(SETTINGS_NOTIFICATIONS_ENABLED_KEY),
        defaultSettingsPreferences.notificationsEnabled
      ),
      analyticsEnabled: parseBooleanSetting(
        storageService.getItem(SETTINGS_ANALYTICS_ENABLED_KEY),
        defaultSettingsPreferences.analyticsEnabled
      )
    }
  },

  savePreferences(preferences: SettingsPreferences): void {
    storageService.setItem(
      SETTINGS_NOTIFICATIONS_ENABLED_KEY,
      preferences.notificationsEnabled ? 'true' : 'false'
    )
    storageService.setItem(
      SETTINGS_ANALYTICS_ENABLED_KEY,
      preferences.analyticsEnabled ? 'true' : 'false'
    )
  },

  buildSyncPreview(input: BuildSettingsSyncPreviewInput): SettingsSyncPreview {
    const rows: SettingsSyncPreviewRow[] = [
      {
        key: 'backend-provider',
        label: 'Backend provider',
        value: input.backendProvider,
        status: 'neutral'
      },
      {
        key: 'sync-endpoint',
        label: 'Sync endpoint',
        value: input.hasRemoteSyncEndpoint ? 'configured' : 'not implemented yet',
        status: input.hasRemoteSyncEndpoint ? 'ok' : 'warning'
      },
      {
        key: 'actor',
        label: 'Requested by',
        value: input.actor
          ? `${input.actor.email} (${input.actor.role})`
          : 'No active admin session',
        status: input.actor ? 'ok' : 'warning'
      },
      {
        key: 'notifications',
        label: 'Push notifications',
        value: input.preferences.notificationsEnabled ? 'enabled' : 'disabled',
        status: 'neutral'
      },
      {
        key: 'analytics',
        label: 'Analytics',
        value: input.preferences.analyticsEnabled ? 'enabled' : 'disabled',
        status: 'neutral'
      },
      {
        key: 'admin-module',
        label: 'Admin module',
        value: input.hasAdminModule ? 'enabled' : 'disabled',
        status: input.hasAdminModule ? 'ok' : 'warning'
      }
    ]

    const hasBlockingWarning = !input.actor || !input.hasRemoteSyncEndpoint

    return {
      status: hasBlockingWarning ? 'warning' : 'ok',
      summary: hasBlockingWarning
        ? 'Preview only. PMNative can show the sync payload inputs, but server sync is not implemented yet.'
        : 'Settings are ready to sync to a backend endpoint.',
      nextStep: input.hasRemoteSyncEndpoint
        ? 'Invoke the configured settings sync endpoint and handle conflict/merge rules.'
        : 'Define a provider-backed settings sync endpoint and map this preview payload to the request body.',
      rows
    }
  }
}
