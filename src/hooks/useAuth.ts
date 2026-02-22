import { useCallback } from 'react'

import { ApiError } from '@/services/api'
import {
  PENDING_SOCIAL_AUTH_CONTEXT_KEY,
  SESSION_REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
  SESSION_USER_KEY
} from '@/services/auth.constants'
import { authProvider } from '@/services/auth/provider'
import {
  AuthProviderError,
  type SocialAuthMode,
  type SocialAuthProvider
} from '@/services/auth/provider.types'
import { storageService } from '@/services/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  AuthRegisterResult,
  AuthSocialResult,
  AuthSession,
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput
} from '@/types/auth'
import { forgotPasswordSchema, loginSchema, registerSchema } from '@/utils/validation'

const isStoredAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<AuthUser>

  const isValidRole = ['master', 'admin', 'editor', 'user'].includes(candidate.role ?? '')
  const hasValidName = typeof candidate.name === 'string' || candidate.name === null

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    hasValidName &&
    isValidRole
  )
}

const parseStoredUser = (payload: string | null): AuthUser | null => {
  if (!payload) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(payload)
    return isStoredAuthUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

const clearStoredSession = async (): Promise<void> => {
  await storageService.removeSecureItem(SESSION_TOKEN_KEY)
  await storageService.removeSecureItem(SESSION_REFRESH_TOKEN_KEY)
  storageService.removeItem(SESSION_USER_KEY)
}

const persistSession = async (session: AuthSession): Promise<void> => {
  await storageService.setSecureItem(SESSION_TOKEN_KEY, session.token)

  if (typeof session.refreshToken === 'string' && session.refreshToken.length > 0) {
    await storageService.setSecureItem(SESSION_REFRESH_TOKEN_KEY, session.refreshToken)
  } else {
    await storageService.removeSecureItem(SESSION_REFRESH_TOKEN_KEY)
  }

  storageService.setItem(SESSION_USER_KEY, JSON.stringify(session.user))
}

interface PendingSocialAuthContext {
  provider: SocialAuthProvider
  mode: SocialAuthMode
  createdAt: number
}

const PENDING_SOCIAL_AUTH_TTL_MS = 15 * 60 * 1000

const parsePendingSocialAuthContext = (payload: string | null): PendingSocialAuthContext | null => {
  if (!payload) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(payload)

    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const candidate = parsed as Partial<PendingSocialAuthContext>
    const validProvider = ['google', 'telegram', 'vk'].includes(candidate.provider ?? '')
    const validMode = candidate.mode === 'login' || candidate.mode === 'register'

    if (!validProvider || !validMode || typeof candidate.createdAt !== 'number') {
      return null
    }

    return {
      provider: candidate.provider as SocialAuthProvider,
      mode: candidate.mode as SocialAuthMode,
      createdAt: candidate.createdAt
    }
  } catch {
    return null
  }
}

const setPendingSocialAuthContext = (provider: SocialAuthProvider, mode: SocialAuthMode): void => {
  const payload: PendingSocialAuthContext = {
    provider,
    mode,
    createdAt: Date.now()
  }

  storageService.setItem(PENDING_SOCIAL_AUTH_CONTEXT_KEY, JSON.stringify(payload))
}

const clearPendingSocialAuthContext = (): void => {
  storageService.removeItem(PENDING_SOCIAL_AUTH_CONTEXT_KEY)
}

const getStoredPendingSocialAuthContext = (): PendingSocialAuthContext | null => {
  const parsed = parsePendingSocialAuthContext(storageService.getItem(PENDING_SOCIAL_AUTH_CONTEXT_KEY))

  if (!parsed) {
    clearPendingSocialAuthContext()
    return null
  }

  if (Date.now() - parsed.createdAt > PENDING_SOCIAL_AUTH_TTL_MS) {
    clearPendingSocialAuthContext()
    return null
  }

  return parsed
}

const parseCallbackSocialContext = (
  callbackUrl: string
): { provider: SocialAuthProvider | null; mode: SocialAuthMode | null } => {
  try {
    const parsedUrl = new URL(callbackUrl)

    const provider = parsedUrl.searchParams.get('provider')
    const mode = parsedUrl.searchParams.get('mode')

    return {
      provider:
        provider === 'google' || provider === 'telegram' || provider === 'vk'
          ? provider
          : null,
      mode: mode === 'login' || mode === 'register' ? mode : null
    }
  } catch {
    const location = (globalThis as { location?: { origin?: string } }).location
    const webOrigin = typeof location?.origin === 'string' ? location.origin : null

    if (!webOrigin) {
      return { provider: null, mode: null }
    }

    try {
      const parsedUrl = new URL(callbackUrl, webOrigin)
      const provider = parsedUrl.searchParams.get('provider')
      const mode = parsedUrl.searchParams.get('mode')

      return {
        provider:
          provider === 'google' || provider === 'telegram' || provider === 'vk'
            ? provider
            : null,
        mode: mode === 'login' || mode === 'register' ? mode : null
      }
    } catch {
      return { provider: null, mode: null }
    }
  }
}

const validatePendingSocialAuthCallback = (callbackUrl: string): void => {
  const pendingContext = getStoredPendingSocialAuthContext()

  if (!pendingContext) {
    throw new AuthProviderError('Missing pending social auth context. Please start social sign-in again.', 'PROVIDER')
  }

  const callbackContext = parseCallbackSocialContext(callbackUrl)

  if (callbackContext.provider && callbackContext.provider !== pendingContext.provider) {
    throw new AuthProviderError('Social auth callback provider does not match the started flow', 'PROVIDER')
  }

  if (callbackContext.mode && callbackContext.mode !== pendingContext.mode) {
    throw new AuthProviderError('Social auth callback mode does not match the started flow', 'PROVIDER')
  }
}

const isUnauthorizedAuthError = (error: unknown): boolean => {
  return (
    (error instanceof ApiError && error.status === 401) ||
    (error instanceof AuthProviderError && error.code === 'UNAUTHORIZED')
  )
}

export const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const setHydrating = useAuthStore((state) => state.setHydrating)
  const setSession = useAuthStore((state) => state.setSession)
  const clearSession = useAuthStore((state) => state.clearSession)
  const providerCapabilities = authProvider.getCapabilities()

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (token) {
      return token
    }

    const storedToken = await storageService.getSecureItem(SESSION_TOKEN_KEY)
    return storedToken ?? null
  }, [token])

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefreshToken = await storageService.getSecureItem(SESSION_REFRESH_TOKEN_KEY)

    if (!storedRefreshToken) {
      await clearStoredSession()
      clearSession()
      return null
    }

    try {
      const refreshed = await authProvider.refreshAccessToken(storedRefreshToken)
      await storageService.setSecureItem(SESSION_TOKEN_KEY, refreshed.token)

      if (typeof refreshed.refreshToken === 'string' && refreshed.refreshToken.length > 0) {
        await storageService.setSecureItem(SESSION_REFRESH_TOKEN_KEY, refreshed.refreshToken)
      } else if (refreshed.refreshToken === null) {
        await storageService.removeSecureItem(SESSION_REFRESH_TOKEN_KEY)
      }

      const activeUser = refreshed.user ?? useAuthStore.getState().user
      if (activeUser) {
        storageService.setItem(SESSION_USER_KEY, JSON.stringify(activeUser))
        setSession(activeUser, refreshed.token)
      }

      return refreshed.token
    } catch {
      await clearStoredSession()
      clearSession()
      return null
    }
  }, [clearSession, setSession])

  const hydrateSession = useCallback(async (): Promise<void> => {
    setHydrating(true)

    try {
      const storedToken = await storageService.getSecureItem(SESSION_TOKEN_KEY)
      const cachedUser = parseStoredUser(storageService.getItem(SESSION_USER_KEY))

      if (!storedToken) {
        await clearStoredSession()
        clearSession()
        return
      }

      if (cachedUser) {
        setSession(cachedUser, storedToken)
      }

      try {
        const sessionUser = await authProvider.getSessionUser(storedToken)
        setSession(sessionUser, storedToken)
        storageService.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser))
      } catch (error) {
        if (isUnauthorizedAuthError(error)) {
          const refreshedToken = await refreshAccessToken()

          if (!refreshedToken) {
            await clearStoredSession()
            clearSession()
            return
          }

          try {
            const refreshedUser = await authProvider.getSessionUser(refreshedToken)
            setSession(refreshedUser, refreshedToken)
            storageService.setItem(SESSION_USER_KEY, JSON.stringify(refreshedUser))
          } catch (refreshSessionError) {
            if (isUnauthorizedAuthError(refreshSessionError)) {
              await clearStoredSession()
              clearSession()
              return
            }

            if (!cachedUser) {
              await clearStoredSession()
              clearSession()
            } else {
              setSession(cachedUser, refreshedToken)
            }
          }

          return
        }

        if (!cachedUser) {
          await clearStoredSession()
          clearSession()
        }
      }
    } catch {
      await clearStoredSession()
      clearSession()
    } finally {
      setHydrating(false)
    }
  }, [clearSession, refreshAccessToken, setHydrating, setSession])

  const signIn = useCallback(
    async (input: LoginInput): Promise<void> => {
      loginSchema.parse(input)

      const session = await authProvider.login(input)
      await persistSession(session)
      setSession(session.user, session.token)
    },
    [setSession]
  )

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthRegisterResult> => {
      registerSchema.parse(input)

      const result = await authProvider.register(input)

      if (result.kind === 'session') {
        await persistSession(result.session)
        setSession(result.session.user, result.session.token)
      }

      return result
    },
    [setSession]
  )

  const registerWithSocial = useCallback(
    async (provider: SocialAuthProvider): Promise<AuthSocialResult> => {
      setPendingSocialAuthContext(provider, 'register')

      try {
        const result = await authProvider.signInWithSocial(provider, 'register')

        if (result.kind === 'session') {
          clearPendingSocialAuthContext()
          await persistSession(result.session)
          setSession(result.session.user, result.session.token)
        }

        return result
      } catch (error) {
        clearPendingSocialAuthContext()
        throw error
      }
    },
    [setSession]
  )

  const signInWithSocial = useCallback(
    async (provider: SocialAuthProvider): Promise<AuthSocialResult> => {
      setPendingSocialAuthContext(provider, 'login')

      try {
        const result = await authProvider.signInWithSocial(provider, 'login')

        if (result.kind === 'redirect_started') {
          return result
        }

        if (result.kind !== 'session') {
          clearPendingSocialAuthContext()
          throw new AuthProviderError(
            `${provider} social login did not return a session`,
            'PROVIDER'
          )
        }

        clearPendingSocialAuthContext()
        await persistSession(result.session)
        setSession(result.session.user, result.session.token)

        return result
      } catch (error) {
        clearPendingSocialAuthContext()
        throw error
      }
    },
    [setSession]
  )

  const completeSocialAuthCallback = useCallback(
    async (callbackUrl: string): Promise<void> => {
      validatePendingSocialAuthCallback(callbackUrl)

      try {
        const session = await authProvider.completeSocialAuthCallback(callbackUrl)
        await persistSession(session)
        setSession(session.user, session.token)
      } finally {
        clearPendingSocialAuthContext()
      }
    },
    [setSession]
  )

  const requestPasswordReset = useCallback(async (input: ForgotPasswordInput): Promise<void> => {
    forgotPasswordSchema.parse(input)
    await authProvider.requestPasswordReset(input)
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      const storedRefreshToken = await storageService.getSecureItem(SESSION_REFRESH_TOKEN_KEY)
      await authProvider.logout({
        accessToken: token,
        refreshToken: storedRefreshToken
      })
    } catch {
      // Local sign-out must still succeed even if remote revoke/logout fails.
    } finally {
      await clearStoredSession()
      clearSession()
    }
  }, [clearSession, token])

  return {
    isAuthenticated: Boolean(token && user),
    isHydrating,
    token,
    user,
    getAccessToken,
    refreshAccessToken,
    hydrateSession,
    signIn,
    signInWithSocial,
    completeSocialAuthCallback,
    register,
    registerWithSocial,
    requestPasswordReset,
    signOut,
    socialAuthCapabilities: providerCapabilities.socialAuth
  }
}
