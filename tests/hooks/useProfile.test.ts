import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SESSION_REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
  SESSION_USER_KEY
} from '@/services/auth.constants'
import type { AuthUser } from '@/types/auth'

type HookSetter<T> = (value: T | ((previous: T) => T)) => void

const hookRuntime = {
  stateSlots: [] as unknown[],
  refSlots: [] as Array<{ current: unknown }>,
  stateCursor: 0,
  refCursor: 0
}

const mockProfileService = {
  getCapabilities: vi.fn(),
  getProfile: vi.fn(),
  refreshProfile: vi.fn(),
  updateProfile: vi.fn()
}

const mockStorageService = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setSecureItem: vi.fn(),
  getSecureItem: vi.fn(),
  removeSecureItem: vi.fn()
}

let mockAuthStoreState: {
  user: AuthUser | null
  token: string | null
  setSession: ReturnType<typeof vi.fn>
  setUser: ReturnType<typeof vi.fn>
}

vi.mock('react', () => ({
  useCallback: <T extends (...args: never[]) => unknown>(callback: T): T => callback,
  useEffect: () => {},
  useRef: <T,>(initialValue: T) => {
    const index = hookRuntime.refCursor++
    if (!hookRuntime.refSlots[index]) {
      hookRuntime.refSlots[index] = { current: initialValue }
    }
    return hookRuntime.refSlots[index] as { current: T }
  },
  useState: <T,>(initialValue: T | (() => T)) => {
    const index = hookRuntime.stateCursor++
    if (hookRuntime.stateSlots[index] === undefined) {
      hookRuntime.stateSlots[index] =
        typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
    }

    const setState: HookSetter<T> = (nextValue) => {
      const currentValue = hookRuntime.stateSlots[index] as T
      hookRuntime.stateSlots[index] =
        typeof nextValue === 'function'
          ? (nextValue as (previous: T) => T)(currentValue)
          : nextValue
    }

    return [hookRuntime.stateSlots[index] as T, setState] as const
  }
}))

vi.mock('@/services/profile.service', () => ({
  profileService: mockProfileService
}))

vi.mock('@/services/storage.service', () => ({
  storageService: mockStorageService
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: <T,>(selector: (state: typeof mockAuthStoreState) => T): T => selector(mockAuthStoreState)
}))

const resetHookRuntime = (): void => {
  hookRuntime.stateSlots = []
  hookRuntime.refSlots = []
  hookRuntime.stateCursor = 0
  hookRuntime.refCursor = 0
}

const renderUseProfile = async () => {
  hookRuntime.stateCursor = 0
  hookRuntime.refCursor = 0
  const { useProfile } = await import('@/hooks/useProfile')
  return useProfile()
}

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetHookRuntime()

    mockAuthStoreState = {
      user: {
        id: 'u1',
        email: 'user@example.com',
        name: '  User Name  ',
        avatarUrl: ' https://cdn.example/current.png ',
        role: 'user'
      },
      token: 'access-token',
      setSession: vi.fn(),
      setUser: vi.fn()
    }

    mockProfileService.getCapabilities.mockReturnValue({
      canFetchRemote: true,
      canUpdateRemote: true,
      detail: 'test-provider'
    })
    mockProfileService.getProfile.mockResolvedValue(mockAuthStoreState.user)
    mockProfileService.refreshProfile.mockResolvedValue(mockAuthStoreState.user)

    mockStorageService.getSecureItem.mockResolvedValue('stored-refresh-token')
    mockStorageService.setSecureItem.mockResolvedValue(undefined)
    mockStorageService.removeSecureItem.mockResolvedValue(undefined)
  })

  it('persists rotated access and refresh tokens after profile save', async () => {
    const updatedUser: AuthUser = {
      ...mockAuthStoreState.user!,
      name: 'Updated Name',
      avatarUrl: 'https://cdn.example/updated.png'
    }

    mockProfileService.updateProfile.mockResolvedValueOnce({
      user: updatedUser,
      rotatedSession: {
        token: 'rotated-access-token',
        refreshToken: 'rotated-refresh-token'
      }
    })

    const profileHook = await renderUseProfile()

    await profileHook.saveProfile()

    expect(mockStorageService.getSecureItem).toHaveBeenCalledWith(SESSION_REFRESH_TOKEN_KEY)
    expect(mockProfileService.updateProfile).toHaveBeenCalledWith({
      sessionUser: mockAuthStoreState.user,
      accessToken: 'access-token',
      refreshToken: 'stored-refresh-token',
      profile: {
        name: 'User Name',
        avatarUrl: 'https://cdn.example/current.png'
      }
    })

    expect(mockStorageService.setItem).toHaveBeenCalledWith(SESSION_USER_KEY, JSON.stringify(updatedUser))
    expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
      SESSION_TOKEN_KEY,
      'rotated-access-token'
    )
    expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
      SESSION_REFRESH_TOKEN_KEY,
      'rotated-refresh-token'
    )
    expect(mockStorageService.removeSecureItem).not.toHaveBeenCalled()

    expect(mockAuthStoreState.setSession).toHaveBeenCalledWith(updatedUser, 'rotated-access-token')
    expect(mockAuthStoreState.setUser).not.toHaveBeenCalled()
  })

  it('removes stored refresh token when rotated session omits it', async () => {
    const updatedUser: AuthUser = {
      ...mockAuthStoreState.user!,
      name: 'Updated Name',
      avatarUrl: null
    }

    mockProfileService.updateProfile.mockResolvedValueOnce({
      user: updatedUser,
      rotatedSession: {
        token: 'rotated-access-token',
        refreshToken: null
      }
    })

    const profileHook = await renderUseProfile()

    await profileHook.saveProfile()

    expect(mockProfileService.updateProfile).toHaveBeenCalledWith({
      sessionUser: mockAuthStoreState.user,
      accessToken: 'access-token',
      refreshToken: 'stored-refresh-token',
      profile: {
        name: 'User Name',
        avatarUrl: 'https://cdn.example/current.png'
      }
    })
    expect(mockStorageService.setItem).toHaveBeenCalledWith(SESSION_USER_KEY, JSON.stringify(updatedUser))
    expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
      SESSION_TOKEN_KEY,
      'rotated-access-token'
    )
    expect(mockStorageService.setSecureItem).not.toHaveBeenCalledWith(
      SESSION_REFRESH_TOKEN_KEY,
      expect.anything()
    )
    expect(mockStorageService.removeSecureItem).toHaveBeenCalledWith(SESSION_REFRESH_TOKEN_KEY)
    expect(mockAuthStoreState.setSession).toHaveBeenCalledWith(updatedUser, 'rotated-access-token')
    expect(mockAuthStoreState.setUser).not.toHaveBeenCalled()
  })
})
