import { beforeEach, describe, expect, it, vi } from 'vitest'

interface LoadProfileProviderOptions {
  provider: 'supabase' | 'generic-rest'
  genericRestProfileEndpoints?: {
    get?: string
    update?: string
    uploadAvatar?: string
  }
  apiRequestImpl?: ReturnType<typeof vi.fn>
  supabaseProfileAvatarsBucket?: string
  supabaseClientImpl?: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
      setSession: ReturnType<typeof vi.fn>
      updateUser: ReturnType<typeof vi.fn>
    }
    storage?: {
      from: ReturnType<typeof vi.fn>
    }
  }
}

const loadProfileProviderModule = async (options: LoadProfileProviderOptions) => {
  vi.resetModules()

  const apiRequestMock = options.apiRequestImpl ?? vi.fn()
  const defaultSupabaseStorage = {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(() => ({
        data: {
          publicUrl: 'https://cdn.example/default-avatar.png'
        }
      }))
    }))
  }
  const supabaseClient = {
    auth: options.supabaseClientImpl?.auth ?? {
      getUser: vi.fn(),
      setSession: vi.fn(),
      updateUser: vi.fn()
    },
    storage: options.supabaseClientImpl?.storage ?? defaultSupabaseStorage
  } as const

  vi.doMock('@/pm-native.config', () => ({
    pmNativeConfig: {
      api: {
        baseUrl: 'https://api.example.com',
        timeoutMs: 1000
      },
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
            : undefined,
        supabase:
          options.provider === 'supabase'
            ? {
                urlEnvVar: 'EXPO_PUBLIC_SUPABASE_URL',
                anonKeyEnvVar: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
                profileAvatarsBucket: options.supabaseProfileAvatarsBucket
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
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

  it('generic-rest uploadAvatar posts multipart data and returns avatarUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          avatarUrl: 'https://cdn.example/uploaded-avatar.png'
        }
      }),
      headers: {
        get: vi.fn(() => 'application/json')
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'generic-rest',
      genericRestProfileEndpoints: {
        get: '/profile/me',
        update: '/profile/me',
        uploadAvatar: '/profile/avatar'
      }
    })

    await expect(
      profileProvider.uploadAvatar({
        userId: 'u1',
        accessToken: 'access-token',
        file: {
          uri: 'file:///tmp/avatar.jpg',
          fileName: 'avatar.jpg',
          mimeType: 'image/jpeg'
        }
      })
    ).resolves.toEqual({
      avatarUrl: 'https://cdn.example/uploaded-avatar.png'
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/profile/avatar',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token'
        })
      })
    )
  })

  it('generic-rest uploadAvatar maps 401 response to UNAUTHORIZED', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({
        message: 'expired token'
      }),
      headers: {
        get: vi.fn(() => 'application/json')
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'generic-rest',
      genericRestProfileEndpoints: {
        get: '/profile/me',
        uploadAvatar: '/profile/avatar'
      }
    })

    await expect(
      profileProvider.uploadAvatar({
        userId: 'u1',
        accessToken: 'access-token',
        file: {
          uri: 'file:///tmp/avatar.jpg',
          fileName: 'avatar.jpg',
          mimeType: 'image/jpeg'
        }
      })
    ).rejects.toMatchObject({
      name: 'ProfileProviderError',
      code: 'UNAUTHORIZED',
      message: 'expired token'
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

  it('supabase uploadAvatar uploads to storage and returns public URL with rotated session', async () => {
    const storageUpload = vi.fn().mockResolvedValue({ error: null })
    const storageGetPublicUrl = vi.fn(() => ({
      data: {
        publicUrl: 'https://cdn.example/public-avatar.png'
      }
    }))
    const storageFrom = vi.fn(() => ({
      upload: storageUpload,
      getPublicUrl: storageGetPublicUrl
    }))

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
        updateUser: vi.fn()
      },
      storage: {
        from: storageFrom
      }
    }

    const localFileFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    })
    vi.stubGlobal('fetch', localFileFetch)
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

    const { profileProvider } = await loadProfileProviderModule({
      provider: 'supabase',
      supabaseProfileAvatarsBucket: 'profile-avatars',
      supabaseClientImpl: supabaseClient
    })

    await expect(
      profileProvider.uploadAvatar({
        userId: 'user-1',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        file: {
          uri: 'file:///tmp/avatar.png',
          fileName: 'avatar.png',
          mimeType: 'image/png'
        }
      })
    ).resolves.toEqual({
      avatarUrl: 'https://cdn.example/public-avatar.png',
      rotatedSession: {
        token: 'rotated-access',
        refreshToken: 'rotated-refresh'
      }
    })

    expect(supabaseClient.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token'
    })
    expect(storageFrom).toHaveBeenCalledWith('profile-avatars')
    expect(storageUpload).toHaveBeenCalledWith(
      'profiles/user-1/avatar-1700000000000.png',
      expect.any(ArrayBuffer),
      {
        contentType: 'image/png',
        upsert: true
      }
    )
    expect(storageGetPublicUrl).toHaveBeenCalledWith('profiles/user-1/avatar-1700000000000.png')
  })
})
