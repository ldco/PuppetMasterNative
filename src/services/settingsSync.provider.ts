import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import {
  SettingsSyncProviderError,
  type ExecuteSettingsSyncInput,
  type ExecuteSettingsSyncResult,
  type SettingsSyncProvider
} from '@/services/settingsSync.provider.types'

const settingsSyncResponseSchema = z.object({
  syncedAt: z.string().min(1)
})

const genericRestSyncEndpoint = pmNativeConfig.backend.genericRest?.settings?.endpoints.sync

const genericRestSettingsSyncProvider: SettingsSyncProvider = {
  getCapabilities() {
    if (!genericRestSyncEndpoint) {
      return {
        canExecute: false,
        detail: 'generic-rest settings sync endpoint is not configured (backend.genericRest.settings.endpoints.sync)'
      }
    }

    return {
      canExecute: true,
      detail: `POST ${genericRestSyncEndpoint}`
    }
  },

  async executeSync(input: ExecuteSettingsSyncInput): Promise<ExecuteSettingsSyncResult> {
    if (!genericRestSyncEndpoint) {
      throw new SettingsSyncProviderError(
        'generic-rest settings sync endpoint is not configured',
        'CONFIG'
      )
    }

    const response = await apiRequest(genericRestSyncEndpoint, {
      method: 'POST',
      body: input.draft,
      schema: settingsSyncResponseSchema
    }).catch((error: unknown) => {
      if (error instanceof SettingsSyncProviderError) {
        throw error
      }

      throw new SettingsSyncProviderError(
        error instanceof Error ? error.message : 'Settings sync request failed',
        'PROVIDER'
      )
    })

    return {
      kind: 'synced',
      syncedAt: response.syncedAt
    }
  }
}

const notSupportedProvider = (provider: string): SettingsSyncProvider => ({
  getCapabilities() {
    return {
      canExecute: false,
      detail: `${provider} settings sync endpoint is not implemented yet`
    }
  },

  async executeSync(_input: ExecuteSettingsSyncInput): Promise<ExecuteSettingsSyncResult> {
    throw new SettingsSyncProviderError(
      `${provider} settings sync endpoint is not implemented yet`,
      'NOT_SUPPORTED'
    )
  }
})

export const settingsSyncProvider: SettingsSyncProvider = (() => {
  switch (pmNativeConfig.backend.provider) {
    case 'generic-rest':
      return genericRestSettingsSyncProvider
    case 'supabase':
      return notSupportedProvider('supabase')
    default:
      return notSupportedProvider('unknown')
  }
})()
