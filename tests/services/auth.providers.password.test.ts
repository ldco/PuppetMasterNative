import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'

vi.mock('expo-linking', () => ({
  createURL: vi.fn(() => 'exp://127.0.0.1:8081/--/oauth-callback'),
  openURL: vi.fn()
}))

vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: vi.fn()
}))

const loadSupabaseAuthProviderModule = async (supabaseClientImpl?: {
  auth: {
    setSession: ReturnType<typeof vi.fn>
    updateUser: ReturnType<typeof vi.fn>
  }
}) => {
  vi.resetModules()

  const supabaseClient =
    supabaseClientImpl ??
    ({
      auth: {
        setSession: vi.fn(),
        updateUser: vi.fn()
      }
    } as const)

  vi.doMock('@/pm-native.config', () => ({
    pmNativeConfig: {
      backend: {
        provider: 'supabase',
        socialAuth: {
          google: false
        }
      }
    }
  }))

  vi.doMock('@/services/supabase.client', () => ({
    getSupabaseClient: () => supabaseClient
  }))

  const module = await import('@/services/auth/providers/supabaseAuthProvider')

  return {
    supabaseAuthProvider: module.supabaseAuthProvider,
    supabaseClient
  }
}

const loadGenericRestAuthProviderModule = async (options?: {
  changePasswordEndpoint?: string | undefined
  apiRequestMock?: ReturnType<typeof vi.fn>
  omitAuthEndpoints?: boolean
}) => {
  vi.resetModules()
  const apiRequestMock = options?.apiRequestMock ?? vi.fn()
  const changePasswordEndpoint = options?.changePasswordEndpoint
  const omitAuthEndpoints = options?.omitAuthEndpoints ?? false

  vi.doMock('@/pm-native.config', () => ({
    pmNativeConfig: {
      backend: {
        provider: 'generic-rest',
        genericRest: {
          ...(omitAuthEndpoints
            ? {}
            : {
                auth: {
                  endpoints: {
                    login: '/auth/login',
                    register: '/auth/register',
                    changePassword: changePasswordEndpoint,
                    logout: '/auth/logout',
                    session: '/auth/session',
                    refresh: '/auth/refresh'
                  }
                }
              })
        }
      }
    }
  }))

  vi.doMock('@/services/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/services/api')>()

    return {
      ...actual,
      apiRequest: apiRequestMock
    }
  })

  const module = await import('@/services/auth/providers/genericRestAuthProvider')

  return {
    genericRestAuthProvider: module.genericRestAuthProvider,
    apiRequestMock
  }
}

describe('auth providers: updatePassword', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unmock('@/pm-native.config')
    vi.unmock('@/services/supabase.client')
    vi.unmock('@/services/api')
  })

  it('supabase updatePassword returns rotated session and calls setSession + updateUser', async () => {
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

    const { supabaseAuthProvider } = await loadSupabaseAuthProviderModule(supabaseClient)

    await expect(
      supabaseAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).resolves.toEqual({
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
      password: 'new-password-123'
    })
  })

  it('supabase updatePassword maps setSession 403 to UNAUTHORIZED', async () => {
    const supabaseClient = {
      auth: {
        setSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: {
            message: 'forbidden',
            status: 403
          }
        }),
        updateUser: vi.fn()
      }
    }

    const { supabaseAuthProvider } = await loadSupabaseAuthProviderModule(supabaseClient)

    await expect(
      supabaseAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'UNAUTHORIZED'
    })
  })

  it('generic-rest updatePassword is explicitly not supported', async () => {
    const { genericRestAuthProvider } = await loadGenericRestAuthProviderModule()

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'NOT_SUPPORTED'
    })
  })

  it('generic-rest updatePassword posts password to configured endpoint', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue(undefined)
    const { genericRestAuthProvider, apiRequestMock: apiRequestSpy } =
      await loadGenericRestAuthProviderModule({
        changePasswordEndpoint: '/auth/change-password',
        apiRequestMock
      })

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).resolves.toEqual({})

    expect(apiRequestSpy).toHaveBeenCalledWith('/auth/change-password', {
      method: 'POST',
      token: 'access-token',
      body: {
        password: 'new-password-123'
      },
      allowRefresh: false,
      useAuthToken: false
    })
  })

  it('generic-rest updatePassword returns rotated session when backend responds with tokens', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        accessToken: 'rotated-access',
        refreshToken: 'rotated-refresh'
      }
    })

    const { genericRestAuthProvider } = await loadGenericRestAuthProviderModule({
      changePasswordEndpoint: '/auth/change-password',
      apiRequestMock
    })

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).resolves.toEqual({
      rotatedSession: {
        token: 'rotated-access',
        refreshToken: 'rotated-refresh'
      }
    })
  })

  it('generic-rest updatePassword maps ApiError 401 to UNAUTHORIZED', async () => {
    const apiRequestMock = vi
      .fn()
      .mockRejectedValue(new ApiError('token expired', 401, 'AUTH_EXPIRED'))

    const { genericRestAuthProvider } = await loadGenericRestAuthProviderModule({
      changePasswordEndpoint: '/auth/change-password',
      apiRequestMock
    })

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'UNAUTHORIZED',
      message: 'token expired'
    })
  })

  it('generic-rest updatePassword maps ApiError 500 to PROVIDER', async () => {
    const apiRequestMock = vi
      .fn()
      .mockRejectedValue(new ApiError('backend failed', 500, 'SERVER_ERROR'))

    const { genericRestAuthProvider } = await loadGenericRestAuthProviderModule({
      changePasswordEndpoint: '/auth/change-password',
      apiRequestMock
    })

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'PROVIDER',
      message: 'backend failed'
    })
  })

  it('generic-rest updatePassword rejects when access token is missing', async () => {
    const apiRequestMock = vi.fn()
    const { genericRestAuthProvider } = await loadGenericRestAuthProviderModule({
      changePasswordEndpoint: '/auth/change-password',
      apiRequestMock
    })

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: null, refreshToken: 'refresh-token' }
      )
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'UNAUTHORIZED'
    })

    expect(apiRequestMock).not.toHaveBeenCalled()
  })

  it('generic-rest updatePassword maps missing auth endpoints config to CONFIG', async () => {
    const { genericRestAuthProvider } = await loadGenericRestAuthProviderModule({
      omitAuthEndpoints: true
    })

    await expect(
      genericRestAuthProvider.updatePassword(
        { password: 'new-password-123' },
        { accessToken: 'access-token', refreshToken: 'refresh-token' }
      )
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'CONFIG'
    })
  })
})
