import { useCallback } from 'react'

import { ApiError } from '@/services/api'
import {
  SESSION_REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
  SESSION_USER_KEY
} from '@/services/auth.constants'
import { authProvider } from '@/services/auth/provider'
import { AuthProviderError } from '@/services/auth/provider.types'
import { storageService } from '@/services/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import type {
  AuthRegisterResult,
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
    register,
    requestPasswordReset,
    signOut
  }
}
