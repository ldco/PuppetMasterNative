import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfileProviderError } from '@/services/profile.provider.types'

const mockProfileProvider = {
  getCapabilities: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn()
}

vi.mock('@/services/profile.provider', () => ({
  profileProvider: mockProfileProvider
}))

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null without an authenticated session user', async () => {
    const { profileService } = await import('@/services/profile.service')

    const result = await profileService.getProfile({
      sessionUser: null,
      accessToken: null
    })

    expect(result).toBeNull()
    expect(mockProfileProvider.getProfile).not.toHaveBeenCalled()
  })

  it('falls back to session user on CONFIG/NOT_SUPPORTED/UNAUTHORIZED provider errors', async () => {
    const { profileService } = await import('@/services/profile.service')
    const sessionUser = {
      id: 'u1',
      email: 'user@example.com',
      name: 'User',
      role: 'user' as const
    }

    mockProfileProvider.getCapabilities.mockReturnValue({
      canFetchRemote: true,
      canUpdateRemote: false,
      canUploadAvatar: false,
      detail: 'test'
    })

    for (const code of ['CONFIG', 'NOT_SUPPORTED', 'UNAUTHORIZED'] as const) {
      mockProfileProvider.getProfile.mockRejectedValueOnce(new ProfileProviderError(`err-${code}`, code))

      const result = await profileService.getProfile({
        sessionUser,
        accessToken: 'token'
      })

      expect(result).toEqual(sessionUser)
    }
  })

  it('rethrows provider errors that are not explicitly mapped to fallback', async () => {
    const { profileService } = await import('@/services/profile.service')

    mockProfileProvider.getCapabilities.mockReturnValue({
      canFetchRemote: true,
      canUpdateRemote: false,
      canUploadAvatar: false,
      detail: 'test'
    })
    mockProfileProvider.getProfile.mockRejectedValueOnce(new ProfileProviderError('remote failed', 'PROVIDER'))

    await expect(
      profileService.getProfile({
        sessionUser: {
          id: 'u1',
          email: 'user@example.com',
          name: 'User',
          role: 'user'
        },
        accessToken: 'token'
      })
    ).rejects.toMatchObject({ name: 'ProfileProviderError', code: 'PROVIDER' })
  })

  it('passes refresh token through updateProfile to provider', async () => {
    const { profileService } = await import('@/services/profile.service')
    const sessionUser = {
      id: 'u1',
      email: 'user@example.com',
      name: 'User',
      role: 'user' as const
    }
    const updatedUser = {
      ...sessionUser,
      name: 'Updated',
      avatarUrl: 'https://cdn.example/avatar.png'
    }

    mockProfileProvider.getCapabilities.mockReturnValue({
      canFetchRemote: true,
      canUpdateRemote: true,
      canUploadAvatar: true,
      detail: 'test'
    })
    mockProfileProvider.updateProfile.mockResolvedValueOnce({
      user: updatedUser,
      rotatedSession: {
        token: 'rotated-access',
        refreshToken: 'rotated-refresh'
      }
    })

    const result = await profileService.updateProfile({
      sessionUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      profile: {
        name: 'Updated',
        avatarUrl: 'https://cdn.example/avatar.png'
      }
    })

    expect(mockProfileProvider.updateProfile).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      profile: {
        name: 'Updated',
        avatarUrl: 'https://cdn.example/avatar.png'
      }
    })
    expect(result).toEqual({
      user: updatedUser,
      rotatedSession: {
        token: 'rotated-access',
        refreshToken: 'rotated-refresh'
      }
    })
  })

  it('passes uploadAvatar input through to provider with userId and refresh token', async () => {
    const { profileService } = await import('@/services/profile.service')
    const sessionUser = {
      id: 'u1',
      email: 'user@example.com',
      name: 'User',
      role: 'user' as const
    }

    mockProfileProvider.getCapabilities.mockReturnValue({
      canFetchRemote: true,
      canUpdateRemote: true,
      canUploadAvatar: true,
      detail: 'test'
    })
    mockProfileProvider.uploadAvatar.mockResolvedValueOnce({
      avatarUrl: 'https://cdn.example/avatar-uploaded.png'
    })

    const result = await profileService.uploadAvatar({
      sessionUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      file: {
        uri: 'file:///tmp/avatar.jpg',
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg'
      }
    })

    expect(mockProfileProvider.uploadAvatar).toHaveBeenCalledWith({
      userId: 'u1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      file: {
        uri: 'file:///tmp/avatar.jpg',
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg'
      }
    })
    expect(result).toEqual({
      avatarUrl: 'https://cdn.example/avatar-uploaded.png'
    })
  })
})
