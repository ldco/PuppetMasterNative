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
        avatar_url: 'https://cdn.example/user-1.png',
        role: 'user'
      })
      .mockResolvedValueOnce({
        user: {
          id: '2',
          email: 'editor@example.com',
          name: 'Editor',
          avatarUrl: 'https://cdn.example/user-2.png',
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
            avatar_url: 'https://cdn.example/user-3.png',
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
      avatarUrl: 'https://cdn.example/user-1.png',
      role: 'user'
    })
    await expect(profileProvider.getProfile({ accessToken: 'token' })).resolves.toEqual({
      id: '2',
      email: 'editor@example.com',
      name: 'Editor',
      avatarUrl: 'https://cdn.example/user-2.png',
      role: 'editor'
    })
    await expect(profileProvider.getProfile({ accessToken: 'token' })).resolves.toEqual({
      id: '3',
      email: 'admin@example.com',
      name: 'Admin',
      avatarUrl: 'https://cdn.example/user-3.png',
      role: 'admin'
    })
  })

  it('generic-rest updateProfile sends PATCH profile payload with avatarUrl', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'user@example.com',
        name: 'Updated',
        avatarUrl: 'https://cdn.example/updated.png',
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
        profile: {
          name: 'Updated',
          avatarUrl: 'https://cdn.example/updated.png'
        }
      })
    ).resolves.toEqual({
      user: {
        id: '1',
        email: 'user@example.com',
        name: 'Updated',
        avatarUrl: 'https://cdn.example/updated.png',
        role: 'user'
      }
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/profile/me', {
      method: 'PATCH',
      token: 'token',
      body: {
        name: 'Updated',
        avatarUrl: 'https://cdn.example/updated.png'
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

  it('supabase updateProfile returns rotated session tokens from setSession and maps avatar_url', async () => {
    const supabaseClient = {
      auth: {
        getUser: vi.fn(),
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
          data: {
            user: {
              id: 'user-1',
              email: 'user@example.com',
              app_metadata: { role: 'user' },
              user_metadata: {
                name: 'Updated',
                avatar_url: 'https://cdn.example/supabase-updated.png'
              }
            }
          },
          error: null
        })
      }
    }

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'supabase',
      supabaseClientImpl: supabaseClient
    })

    await expect(
      profileProvider.updateProfile({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        profile: {
          name: 'Updated',
          avatarUrl: 'https://cdn.example/supabase-updated.png'
        }
      })
    ).resolves.toEqual({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Updated',
        avatarUrl: 'https://cdn.example/supabase-updated.png',
        role: 'user'
      },
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
      data: {
        name: 'Updated',
        avatar_url: 'https://cdn.example/supabase-updated.png'
      }
    })
  })
})
