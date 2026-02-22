import type { SettingsSyncRequestDraft } from '@/services/settingsSync.service'

export interface SettingsSyncProviderCapabilities {
  canExecute: boolean
  detail: string
}

export type SettingsSyncProviderErrorCode = 'NOT_SUPPORTED' | 'CONFIG' | 'PROVIDER' | 'UNKNOWN'

export class SettingsSyncProviderError extends Error {
  readonly code: SettingsSyncProviderErrorCode

  constructor(message: string, code: SettingsSyncProviderErrorCode = 'UNKNOWN') {
    super(message)
    this.name = 'SettingsSyncProviderError'
    this.code = code
  }
}

export interface ExecuteSettingsSyncInput {
  draft: SettingsSyncRequestDraft
}

export interface ExecuteSettingsSyncResult {
  kind: 'synced'
  syncedAt: string
}

export interface SettingsSyncProvider {
  getCapabilities: () => SettingsSyncProviderCapabilities
  executeSync: (input: ExecuteSettingsSyncInput) => Promise<ExecuteSettingsSyncResult>
}
