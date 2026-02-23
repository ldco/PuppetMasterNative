import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SESSION_REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY } from '@/services/auth.constants'

const mockAuthProvider = {
  getCapabilities: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  signInWithSocial: vi.fn(),
  completeSocialAuthCallback: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  logout: vi.fn(),
  getSessionUser: vi.fn(),
  refreshAccessToken: vi.fn()
}

const mockStorageService = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setSecureItem: vi.fn(),
  getSecureItem: vi.fn(),
  removeSecureItem: vi.fn()
}

type AuthStoreState = {
  user: {
    id: string
    email: string
    name: string | null
    role: 'user' | 'editor' | 'admin' | 'master'
    avatarUrl?: string | null
  } | null
  token: string | null
  isHydrating: boolean
  setHydrating: ReturnType<typeof vi.fn>
  setSession: ReturnType<typeof vi.fn>
  clearSession: ReturnType<typeof vi.fn>
}

let mockAuthStoreState: AuthStoreState

type UseAuthStoreMock = (<T>(selector: (state: AuthStoreState) => T) => T) & {
  getState: () => AuthStoreState
}

const useAuthStoreMock = ((selector: (state: AuthStoreState) => unknown) =>
  selector(mockAuthStoreState)) as UseAuthStoreMock
useAuthStoreMock.getState = () => mockAuthStoreState

vi.mock('react', () => ({
  useCallback: <T extends (...args: never[]) => unknown>(callback: T): T => callback
}))

vi.mock('@/services/auth/provider', () => ({
  authProvider: mockAuthProvider
}))

vi.mock('@/services/storage.service', () => ({
  storageService: mockStorageService
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: useAuthStoreMock
}))

const loadUseAuth = async () => {
  const module = await import('@/hooks/useAuth')
  return module.useAuth
}

describe('useAuth.changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockAuthStoreState = {
      user: {
        id: 'u1',
        email: 'user@example.com',
        name: 'User',
        role: 'user',
        avatarUrl: 'https://cdn.example/avatar.png'
      },
      token: 'access-token',
      isHydrating: false,
      setHydrating: vi.fn(),
      setSession: vi.fn(),
      clearSession: vi.fn()
    }

    mockAuthProvider.getCapabilities.mockReturnValue({
      socialAuth: {
        google: false,
        telegram: false,
        vk: false
      },
      canUpdatePassword: true
    })

    mockStorageService.getSecureItem.mockResolvedValue('refresh-token')
    mockStorageService.setSecureItem.mockResolvedValue(undefined)
    mockStorageService.removeSecureItem.mockResolvedValue(undefined)
  })

  it('persists rotated tokens and updates auth store after direct password change', async () => {
    mockAuthProvider.updatePassword.mockResolvedValueOnce({
      rotatedSession: {
        token: 'rotated-access-token',
        refreshToken: 'rotated-refresh-token'
      }
    })

    const useAuth = await loadUseAuth()
    const auth = useAuth()

    await auth.changePassword({
      password: 'new-password-123'
    })

    expect(mockStorageService.getSecureItem).toHaveBeenCalledWith(SESSION_REFRESH_TOKEN_KEY)
    expect(mockAuthProvider.updatePassword).toHaveBeenCalledWith(
      { password: 'new-password-123' },
      {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }
    )
    expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
      SESSION_TOKEN_KEY,
      'rotated-access-token'
    )
    expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
      SESSION_REFRESH_TOKEN_KEY,
      'rotated-refresh-token'
    )
    expect(mockStorageService.removeSecureItem).not.toHaveBeenCalledWith(SESSION_REFRESH_TOKEN_KEY)
    expect(mockAuthStoreState.setSession).toHaveBeenCalledWith(
      mockAuthStoreState.user,
      'rotated-access-token'
    )
  })

  it('removes stored refresh token when provider returns null rotated refresh token', async () => {
    mockAuthProvider.updatePassword.mockResolvedValueOnce({
      rotatedSession: {
        token: 'rotated-access-token',
        refreshToken: null
      }
    })

    const useAuth = await loadUseAuth()
    const auth = useAuth()

    await auth.changePassword({
      password: 'new-password-123'
    })

    expect(mockStorageService.setSecureItem).toHaveBeenCalledWith(
      SESSION_TOKEN_KEY,
      'rotated-access-token'
    )
    expect(mockStorageService.removeSecureItem).toHaveBeenCalledWith(SESSION_REFRESH_TOKEN_KEY)
    expect(mockAuthStoreState.setSession).toHaveBeenCalledWith(
      mockAuthStoreState.user,
      'rotated-access-token'
    )
  })

  it('rejects when no authenticated session is available', async () => {
    mockAuthStoreState = {
      ...mockAuthStoreState,
      user: null,
      token: null
    }

    const useAuth = await loadUseAuth()
    const auth = useAuth()

    await expect(
      auth.changePassword({
        password: 'new-password-123'
      })
    ).rejects.toMatchObject({
      name: 'AuthProviderError',
      code: 'UNAUTHORIZED'
    })

    expect(mockAuthProvider.updatePassword).not.toHaveBeenCalled()
  })
})
