import type { SettingsPreferences } from '@/services/settings.service'
import type { BackendProvider, Role } from '@/types/config'

export interface SettingsSyncPreviewActor {
  id: string
  email: string
  role: Role
}

export interface BuildSettingsSyncPreviewInput {
  preferences: SettingsPreferences
  backendProvider: BackendProvider
  hasAdminModule: boolean
  actor: SettingsSyncPreviewActor | null
  hasRemoteSyncEndpoint: boolean
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

export interface SettingsSyncRequestDraft {
  schema: 'pmnative.settings.sync/1'
  backendProvider: BackendProvider
  actor: SettingsSyncPreviewActor | null
  preferences: SettingsPreferences
  context: {
    source: 'admin-settings'
    hasAdminModule: boolean
    hasRemoteSyncEndpoint: boolean
    mode: 'preview'
  }
}

export const settingsSyncService = {
  buildPreview(input: BuildSettingsSyncPreviewInput): SettingsSyncPreview {
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
  },

  buildRequestDraft(input: BuildSettingsSyncPreviewInput): SettingsSyncRequestDraft {
    return {
      schema: 'pmnative.settings.sync/1',
      backendProvider: input.backendProvider,
      actor: input.actor,
      preferences: input.preferences,
      context: {
        source: 'admin-settings',
        hasAdminModule: input.hasAdminModule,
        hasRemoteSyncEndpoint: input.hasRemoteSyncEndpoint,
        mode: 'preview'
      }
    }
  }
}
