import { useMemo } from 'react'

import { useConfig } from '@/hooks/useConfig'

export type BackendDiagnosticStatus = 'ok' | 'warning' | 'error' | 'info'

export interface BackendDiagnosticItem {
  key: string
  label: string
  status: BackendDiagnosticStatus
  detail: string
}

export interface BackendDiagnostics {
  provider: 'generic-rest' | 'supabase'
  items: BackendDiagnosticItem[]
}

const getRuntimeEnv = (): Record<string, string | undefined> => {
  const runtimeEnv = globalThis as {
    process?: {
      env?: Record<string, string | undefined>
    }
  }

  return runtimeEnv.process?.env ?? {}
}

const hasValue = (value: string | undefined): boolean => {
  return typeof value === 'string' && value.trim().length > 0
}

export const useBackendDiagnostics = (): BackendDiagnostics => {
  const config = useConfig()

  return useMemo(() => {
    const env = getRuntimeEnv()
    const items: BackendDiagnosticItem[] = []

    items.push({
      key: 'provider',
      label: 'Active provider',
      status: 'info',
      detail: config.backend.provider
    })

    if (config.backend.provider === 'supabase') {
      const supabaseConfig = config.backend.supabase

      if (!supabaseConfig) {
        items.push({
          key: 'supabase-config',
          label: 'Supabase config',
          status: 'error',
          detail: 'Missing backend.supabase configuration'
        })
      } else {
        const urlValue = env[supabaseConfig.urlEnvVar]
        const anonKeyValue = env[supabaseConfig.anonKeyEnvVar]

        items.push({
          key: 'supabase-url',
          label: supabaseConfig.urlEnvVar,
          status: hasValue(urlValue) ? 'ok' : 'error',
          detail: hasValue(urlValue) ? 'Configured' : 'Missing env value'
        })

        items.push({
          key: 'supabase-anon',
          label: supabaseConfig.anonKeyEnvVar,
          status: hasValue(anonKeyValue) ? 'ok' : 'error',
          detail: hasValue(anonKeyValue) ? 'Configured' : 'Missing env value'
        })
      }

      items.push({
        key: 'api-base-url',
        label: 'EXPO_PUBLIC_API_BASE_URL',
        status: 'info',
        detail: 'Optional (used by generic-rest provider)'
      })
    } else {
      const endpoints = config.backend.genericRest?.auth.endpoints
      const apiBaseUrl = env.EXPO_PUBLIC_API_BASE_URL ?? config.api.baseUrl
      const looksPlaceholder = apiBaseUrl.includes('example.com')

      items.push({
        key: 'api-base-url',
        label: 'API base URL',
        status: looksPlaceholder ? 'warning' : 'ok',
        detail: looksPlaceholder ? 'Using placeholder URL' : apiBaseUrl
      })

      items.push({
        key: 'auth-endpoints',
        label: 'Auth endpoints',
        status: endpoints ? 'ok' : 'error',
        detail: endpoints ? 'Configured in pm-native.config.ts' : 'Missing generic-rest auth endpoints'
      })
    }

    const socialAuth = config.backend.socialAuth
    const isGoogleEnabled = Boolean(socialAuth?.google)
    const isTelegramEnabled = Boolean(socialAuth?.telegram)
    const isVkEnabled = Boolean(socialAuth?.vk)

    items.push({
      key: 'social-google',
      label: 'Social auth: Google',
      status:
        config.backend.provider === 'supabase'
          ? isGoogleEnabled
            ? 'ok'
            : 'warning'
          : isGoogleEnabled
            ? 'warning'
            : 'info',
      detail:
        config.backend.provider === 'supabase'
          ? isGoogleEnabled
            ? 'Enabled (PMN-021 runtime path implemented)'
            : 'Disabled in backend.socialAuth.google'
          : isGoogleEnabled
            ? 'Enabled in config, but runtime support is not implemented for this provider'
            : 'Disabled'
    })

    items.push({
      key: 'social-telegram',
      label: 'Social auth: Telegram',
      status: isTelegramEnabled ? 'warning' : 'info',
      detail: isTelegramEnabled
        ? 'Flag enabled, but provider adapters are not implemented yet'
        : 'Disabled'
    })

    items.push({
      key: 'social-vk',
      label: 'Social auth: VK',
      status: isVkEnabled ? 'warning' : 'info',
      detail: isVkEnabled
        ? 'Flag enabled, but provider adapters are not implemented yet'
        : 'Disabled'
    })

    items.push({
      key: 'social-callback-route',
      label: 'Social auth callback route',
      status: config.backend.provider === 'supabase' && isGoogleEnabled ? 'ok' : 'info',
      detail:
        config.backend.provider === 'supabase' && isGoogleEnabled
          ? 'App route /oauth-callback is implemented; confirm Supabase redirect URLs include native + web callbacks'
          : 'Route exists at /oauth-callback (only used when social auth is enabled)'
    })

    return {
      provider: config.backend.provider,
      items
    }
  }, [config])
}
