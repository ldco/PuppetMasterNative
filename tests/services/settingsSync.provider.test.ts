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
}

const loadProviderModule = async (options: LoadProviderOptions) => {
  vi.resetModules()

  const apiRequestMock = options.apiRequestImpl ?? vi.fn()

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
          : {}
      }
    }
  }))

  vi.doMock('@/services/api', () => ({
    apiRequest: apiRequestMock
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
    vi.unmock('@/pm-native.config')
    vi.unmock('@/services/api')
  })

  it('returns NOT_SUPPORTED for supabase provider', async () => {
    const { settingsSyncProvider } = await loadProviderModule({
      provider: 'supabase'
    })

    expect(settingsSyncProvider.getCapabilities()).toEqual({
      canExecute: false,
      detail: 'supabase settings sync endpoint is not implemented yet'
    })

    await expect(
      settingsSyncProvider.executeSync({
        draft: sampleDraft
      })
    ).rejects.toMatchObject({
      name: 'SettingsSyncProviderError',
      code: 'NOT_SUPPORTED'
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
