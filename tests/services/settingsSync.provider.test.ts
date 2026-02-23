import { beforeEach, describe, expect, it, vi } from 'vitest'

const sampleDraft = {
  schema: 'pmnative.settings.sync/1' as const,
  backendProvider: 'generic-rest' as const,
  actor: {
    id: 'u1',
    email: 'admin@example.com',
    role: 'admin' as const
  },
  preferences: {
    notificationsEnabled: true,
    analyticsEnabled: false
  },
  context: {
    source: 'admin-settings' as const,
    hasAdminModule: true,
    hasRemoteSyncEndpoint: true,
    mode: 'preview' as const
  }
}

interface LoadProviderOptions {
  provider: 'supabase' | 'generic-rest'
  syncEndpoint?: string
  apiRequestImpl?: ReturnType<typeof vi.fn>
  supabaseClientImpl?: {
    auth: {
      setSession: ReturnType<typeof vi.fn>
      updateUser: ReturnType<typeof vi.fn>
    }
  }
}

const loadProviderModule = async (options: LoadProviderOptions) => {
  vi.resetModules()

  const apiRequestMock = options.apiRequestImpl ?? vi.fn()
  const supabaseClient = options.supabaseClientImpl ?? {
    auth: {
      setSession: vi.fn(),
      updateUser: vi.fn()
    }
  }

  vi.doMock('@/pm-native.config', () => ({
    pmNativeConfig: {
      backend: {
        provider: options.provider,
        genericRest: options.syncEndpoint
          ? {
              settings: {
                endpoints: {
                  sync: options.syncEndpoint
                }
              }
            }
          : {},
        supabase:
          options.provider === 'supabase'
            ? {
                urlEnvVar: 'EXPO_PUBLIC_SUPABASE_URL',
                anonKeyEnvVar: 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
              }
            : undefined
      }
    }
  }))

  vi.doMock('@/services/api', () => ({
    apiRequest: apiRequestMock
  }))

  vi.doMock('@/services/supabase.client', () => ({
    getSupabaseClient: () => supabaseClient
  }))

  const module = await import('@/services/settingsSync.provider')
  const typesModule = await import('@/services/settingsSync.provider.types')

  return {
    settingsSyncProvider: module.settingsSyncProvider,
    apiRequestMock,
    SettingsSyncProviderError: typesModule.SettingsSyncProviderError
  }
}

describe('settingsSyncProvider', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unmock('@/pm-native.config')
    vi.unmock('@/services/api')
    vi.unmock('@/services/supabase.client')
  })

  it('executes supabase settings sync and returns rotated session', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-23T12:34:56.000Z'))

    const supabaseClient = {
      auth: {
        setSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'rotated-access',
              refresh_token: 'rotated-refresh'
            }
          },
          error: null
        }),
        updateUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' } },
          error: null
        })
      }
    }

    const { settingsSyncProvider } = await loadProviderModule({
      provider: 'supabase',
      supabaseClientImpl: supabaseClient
    })

    expect(settingsSyncProvider.getCapabilities()).toEqual({
      canExecute: true,
      detail: 'UPDATE supabase.auth.updateUser(user_metadata.pmnative_settings_sync)'
    })

    await expect(
      settingsSyncProvider.executeSync({
        draft: sampleDraft,
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })
    ).resolves.toEqual({
      kind: 'synced',
      syncedAt: '2026-02-23T12:34:56.000Z',
      rotatedSession: {
        token: 'rotated-access',
        refreshToken: 'rotated-refresh'
      }
    })

    expect(supabaseClient.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token'
    })
    expect(supabaseClient.auth.updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pmnative_settings_sync: expect.objectContaining({
          schema: 'pmnative.settings.sync/1',
          backendProvider: 'generic-rest',
          actor: sampleDraft.actor,
          preferences: sampleDraft.preferences,
          context: expect.objectContaining({
            source: 'admin-settings',
            mode: 'execute'
          })
        }),
        pmnative_settings_synced_at: '2026-02-23T12:34:56.000Z'
      })
    })
  })

  it('returns UNAUTHORIZED for supabase provider when auth tokens are missing', async () => {
    const { settingsSyncProvider } = await loadProviderModule({
      provider: 'supabase'
    })

    await expect(
      settingsSyncProvider.executeSync({
        draft: sampleDraft,
        accessToken: null,
        refreshToken: null
      })
    ).rejects.toMatchObject({
      name: 'SettingsSyncProviderError',
      code: 'UNAUTHORIZED'
    })
  })

  it('returns CONFIG when generic-rest sync endpoint is missing', async () => {
    const { settingsSyncProvider } = await loadProviderModule({
      provider: 'generic-rest'
    })

    expect(settingsSyncProvider.getCapabilities()).toEqual({
      canExecute: false,
      detail:
        'generic-rest settings sync endpoint is not configured (backend.genericRest.settings.endpoints.sync)'
    })

    await expect(
      settingsSyncProvider.executeSync({
        draft: sampleDraft
      })
    ).rejects.toMatchObject({
      name: 'SettingsSyncProviderError',
      code: 'CONFIG'
    })
  })

  it('executes generic-rest sync and maps successful response', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      syncedAt: '2026-02-23T10:00:00.000Z'
    })

    const { settingsSyncProvider } = await loadProviderModule({
      provider: 'generic-rest',
      syncEndpoint: '/settings/sync',
      apiRequestImpl: apiRequestMock
    })

    expect(settingsSyncProvider.getCapabilities()).toEqual({
      canExecute: true,
      detail: 'POST /settings/sync'
    })

    await expect(
      settingsSyncProvider.executeSync({
        draft: sampleDraft
      })
    ).resolves.toEqual({
      kind: 'synced',
      syncedAt: '2026-02-23T10:00:00.000Z'
    })

    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    expect(apiRequestMock).toHaveBeenCalledWith('/settings/sync', {
      method: 'POST',
      body: sampleDraft,
      schema: expect.any(Object)
    })
  })

  it('preserves SettingsSyncProviderError and maps unknown errors to PROVIDER', async () => {
    const settingsErrorApiMock = vi.fn()
    const unknownErrorApiMock = vi.fn().mockRejectedValue(new Error('network down'))

    const settingsErrorProvider = await loadProviderModule({
      provider: 'generic-rest',
      syncEndpoint: '/settings/sync',
      apiRequestImpl: settingsErrorApiMock
    })
    settingsErrorApiMock.mockRejectedValueOnce(
      new settingsErrorProvider.SettingsSyncProviderError('upstream typed error', 'CONFIG')
    )

    await expect(
      settingsErrorProvider.settingsSyncProvider.executeSync({
        draft: sampleDraft
      })
    ).rejects.toMatchObject({ code: 'CONFIG', message: 'upstream typed error' })

    const unknownErrorProvider = await loadProviderModule({
      provider: 'generic-rest',
      syncEndpoint: '/settings/sync',
      apiRequestImpl: unknownErrorApiMock
    })

    await expect(
      unknownErrorProvider.settingsSyncProvider.executeSync({
        draft: sampleDraft
      })
    ).rejects.toMatchObject({ code: 'PROVIDER', message: 'network down' })
  })
})
