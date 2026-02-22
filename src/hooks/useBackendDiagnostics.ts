import * as ExpoLinking from 'expo-linking'
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

const getWebOrigin = (): string | null => {
  const location = (globalThis as { location?: { origin?: string } }).location
  return typeof location?.origin === 'string' && location.origin.length > 0 ? location.origin : null
}

const resolveRuntimeSocialCallbackUrl = (): string | null => {
  try {
    return ExpoLinking.createURL('/oauth-callback')
  } catch {
    return null
  }
}

const resolveWebSocialCallbackUrl = (): string | null => {
  const webOrigin = getWebOrigin()

  if (!webOrigin) {
    return null
  }

  try {
    return new URL('/oauth-callback', webOrigin).toString()
  } catch {
    return null
  }
}

export const useBackendDiagnostics = (): BackendDiagnostics => {
  const config = useConfig()

  return useMemo(() => {
    const env = getRuntimeEnv()
    const items: BackendDiagnosticItem[] = []
    const supabaseConfig = config.backend.supabase
    const supabaseUrlValue = supabaseConfig ? env[supabaseConfig.urlEnvVar] : undefined
    const supabaseAnonKeyValue = supabaseConfig ? env[supabaseConfig.anonKeyEnvVar] : undefined
    const hasSupabaseUrl = hasValue(supabaseUrlValue)
    const hasSupabaseAnonKey = hasValue(supabaseAnonKeyValue)

    items.push({
      key: 'provider',
      label: 'Active provider',
      status: 'info',
      detail: config.backend.provider
    })

    if (config.backend.provider === 'supabase') {
      if (!supabaseConfig) {
        items.push({
          key: 'supabase-config',
          label: 'Supabase config',
          status: 'error',
          detail: 'Missing backend.supabase configuration'
        })
      } else {
        items.push({
          key: 'supabase-url',
          label: supabaseConfig.urlEnvVar,
          status: hasSupabaseUrl ? 'ok' : 'error',
          detail: hasSupabaseUrl ? 'Configured' : 'Missing env value'
        })

        items.push({
          key: 'supabase-anon',
          label: supabaseConfig.anonKeyEnvVar,
          status: hasSupabaseAnonKey ? 'ok' : 'error',
          detail: hasSupabaseAnonKey ? 'Configured' : 'Missing env value'
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

    const runtimeSocialCallbackUrl = resolveRuntimeSocialCallbackUrl()
    const webSocialCallbackUrl = resolveWebSocialCallbackUrl()

    items.push({
      key: 'social-google-readiness',
      label: 'Google social readiness',
      status:
        config.backend.provider !== 'supabase'
          ? isGoogleEnabled
            ? 'warning'
            : 'info'
          : !isGoogleEnabled
            ? 'warning'
            : !supabaseConfig
              ? 'error'
              : hasSupabaseUrl && hasSupabaseAnonKey
                ? 'ok'
                : 'error',
      detail:
        config.backend.provider !== 'supabase'
          ? isGoogleEnabled
            ? 'Switch backend.provider to supabase for current Google social runtime support'
            : 'Disabled'
          : !isGoogleEnabled
            ? 'Enable backend.socialAuth.google to expose the button and callback flow'
            : !supabaseConfig
              ? 'Missing backend.supabase configuration'
              : hasSupabaseUrl && hasSupabaseAnonKey
                ? 'Ready in app config. Next verify Supabase redirect URL allow-list.'
                : 'Supabase env vars are required before Google social auth can run'
    })

    items.push({
      key: 'social-callback-url-runtime',
      label: 'Social callback URL (runtime)',
      status: runtimeSocialCallbackUrl ? 'info' : 'warning',
      detail: runtimeSocialCallbackUrl ?? 'Unable to resolve callback URL at runtime'
    })

    items.push({
      key: 'social-callback-query-note',
      label: 'Social callback query params',
      status: 'info',
      detail:
        'PMNative appends provider/mode query params to the callback URL at runtime for redirect correlation'
    })

    items.push({
      key: 'social-callback-allowlist-native',
      label: 'Supabase allow-list (native)',
      status: 'info',
      detail:
        'Register the native callback base URL in Supabase URL config (use the runtime URL above when testing on device/simulator)'
    })

    items.push({
      key: 'social-callback-allowlist-web',
      label: 'Supabase allow-list (web)',
      status: webSocialCallbackUrl ? 'info' : 'warning',
      detail:
        webSocialCallbackUrl ??
        'Open PMNative web locally to resolve the current web callback URL (/oauth-callback on your web origin)'
    })

    return {
      provider: config.backend.provider,
      items
    }
  }, [config])
}
