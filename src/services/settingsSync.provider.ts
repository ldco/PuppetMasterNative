import { z } from 'zod'
import type { Session } from '@supabase/supabase-js'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { getSupabaseClient } from '@/services/supabase.client'
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

const toSupabaseSettingsSyncErrorCode = (status?: number): 'UNAUTHORIZED' | 'PROVIDER' => {
  return status === 401 || status === 403 ? 'UNAUTHORIZED' : 'PROVIDER'
}

const requireAccessToken = (accessToken?: string | null): string => {
  if (!accessToken) {
    throw new SettingsSyncProviderError('No access token available for settings sync', 'UNAUTHORIZED')
  }

  return accessToken
}

const requireRefreshToken = (refreshToken?: string | null): string => {
  if (!refreshToken) {
    throw new SettingsSyncProviderError('No refresh token available for settings sync', 'UNAUTHORIZED')
  }

  return refreshToken
}

const toRotatedSession = (session: Session | null | undefined): ExecuteSettingsSyncResult['rotatedSession'] => {
  if (!session?.access_token) {
    return undefined
  }

  return {
    token: session.access_token,
    refreshToken: session.refresh_token
  }
}

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

const supabaseSettingsSyncProvider: SettingsSyncProvider = {
  getCapabilities() {
    return {
      canExecute: true,
      detail: 'UPDATE supabase.auth.updateUser(user_metadata.pmnative_settings_sync)'
    }
  },

  async executeSync(input: ExecuteSettingsSyncInput): Promise<ExecuteSettingsSyncResult> {
    const accessToken = requireAccessToken(input.accessToken)
    const refreshToken = requireRefreshToken(input.refreshToken)
    const supabase = getSupabaseClient()

    const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (setSessionError) {
      throw new SettingsSyncProviderError(
        setSessionError.message,
        toSupabaseSettingsSyncErrorCode(setSessionError.status)
      )
    }

    const syncedAt = new Date().toISOString()
    const { error } = await supabase.auth.updateUser({
      data: {
        pmnative_settings_sync: {
          schema: input.draft.schema,
          backendProvider: input.draft.backendProvider,
          actor: input.draft.actor,
          preferences: input.draft.preferences,
          context: {
            ...input.draft.context,
            mode: 'execute'
          }
        },
        pmnative_settings_synced_at: syncedAt
      }
    })

    if (error) {
      throw new SettingsSyncProviderError(error.message, toSupabaseSettingsSyncErrorCode(error.status))
    }

    return {
      kind: 'synced',
      syncedAt,
      rotatedSession: toRotatedSession(setSessionData.session)
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
      return supabaseSettingsSyncProvider
    default:
      return notSupportedProvider('unknown')
  }
})()
