import { beforeEach, describe, expect, it, vi } from 'vitest'

interface LoadProfileProviderOptions {
  provider: 'supabase' | 'generic-rest'
  genericRestProfileEndpoints?: {
    get?: string
    update?: string
  }
  apiRequestImpl?: ReturnType<typeof vi.fn>
  supabaseClientImpl?: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
      setSession: ReturnType<typeof vi.fn>
      updateUser: ReturnType<typeof vi.fn>
    }
  }
}

const loadProfileProviderModule = async (options: LoadProfileProviderOptions) => {
  vi.resetModules()

  const apiRequestMock = options.apiRequestImpl ?? vi.fn()
  const supabaseClient =
    options.supabaseClientImpl ??
    ({
      auth: {
        getUser: vi.fn(),
        setSession: vi.fn(),
        updateUser: vi.fn()
      }
    } as const)

  vi.doMock('@/pm-native.config', () => ({
    pmNativeConfig: {
      backend: {
        provider: options.provider,
        genericRest:
          options.provider === 'generic-rest'
            ? {
                profile: options.genericRestProfileEndpoints
                  ? {
                      endpoints: options.genericRestProfileEndpoints
                    }
                  : undefined
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

  const module = await import('@/services/profile.provider')

  return {
    profileProvider: module.profileProvider,
    apiRequestMock,
    supabaseClient
  }
}

describe('profileProvider', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unmock('@/pm-native.config')
    vi.unmock('@/services/api')
    vi.unmock('@/services/supabase.client')
  })

  it('generic-rest getProfile normalizes payload variants', async () => {
    const apiRequestMock = vi
      .fn()
      .mockResolvedValueOnce({
        id: '1',
        email: 'user@example.com',
        name: 'User',
        role: 'user'
      })
      .mockResolvedValueOnce({
        user: {
          id: '2',
          email: 'editor@example.com',
          name: 'Editor',
          role: 'editor'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: '3',
            email: 'admin@example.com',
            name: 'Admin',
            role: 'admin'
          }
        }
      })

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'generic-rest',
      genericRestProfileEndpoints: {
        get: '/profile/me'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(profileProvider.getProfile({ accessToken: 'token' })).resolves.toEqual({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      role: 'user'
    })
    await expect(profileProvider.getProfile({ accessToken: 'token' })).resolves.toEqual({
      id: '2',
      email: 'editor@example.com',
      name: 'Editor',
      role: 'editor'
    })
    await expect(profileProvider.getProfile({ accessToken: 'token' })).resolves.toEqual({
      id: '3',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin'
    })
  })

  it('generic-rest updateProfile sends PATCH name payload', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'user@example.com',
        name: 'Updated',
        role: 'user'
      }
    })

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'generic-rest',
      genericRestProfileEndpoints: {
        get: '/profile/me',
        update: '/profile/me'
      },
      apiRequestImpl: apiRequestMock
    })

    await expect(
      profileProvider.updateProfile({
        accessToken: 'token',
        profile: { name: 'Updated' }
      })
    ).resolves.toEqual({
      id: '1',
      email: 'user@example.com',
      name: 'Updated',
      role: 'user'
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/profile/me', {
      method: 'PATCH',
      token: 'token',
      body: {
        name: 'Updated'
      },
      schema: expect.any(Object),
      useAuthToken: false
    })
  })

  it('supabase getProfile maps 403 to UNAUTHORIZED', async () => {
    const supabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            message: 'forbidden',
            status: 403
          }
        }),
        setSession: vi.fn(),
        updateUser: vi.fn()
      }
    }

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'supabase',
      supabaseClientImpl: supabaseClient
    })

    await expect(profileProvider.getProfile({ accessToken: 'token' })).rejects.toMatchObject({
      name: 'ProfileProviderError',
      code: 'UNAUTHORIZED'
    })
  })

  it('supabase updateProfile requires refresh token', async () => {
    const { profileProvider } = await loadProfileProviderModule({
      provider: 'supabase'
    })

    await expect(
      profileProvider.updateProfile({
        accessToken: 'token',
        refreshToken: null,
        profile: { name: 'Updated' }
      })
    ).rejects.toMatchObject({
      name: 'ProfileProviderError',
      code: 'UNAUTHORIZED'
    })
  })
})
