import { pmNativeConfig } from '@/pm-native.config'
import {
  SettingsSyncProviderError,
  type ExecuteSettingsSyncInput,
  type ExecuteSettingsSyncResult,
  type SettingsSyncProvider
} from '@/services/settingsSync.provider.types'

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
      return notSupportedProvider('generic-rest')
    case 'supabase':
      return notSupportedProvider('supabase')
    default:
      return notSupportedProvider('unknown')
  }
})()
