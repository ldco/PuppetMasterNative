import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { ApiError, apiRequest } from '@/services/api'
import { AuthProviderError, defaultAuthProviderCapabilities, type AuthProvider } from '@/services/auth/provider.types'
import { genericRestUserSchema } from '@/services/genericRest.schemas'
import type {
  AuthRegisterResult,
  AuthSession,
  ChangePasswordResult,
  RefreshSessionResult
} from '@/types/auth'

const authSessionSchema = z.object({
  token: z.string().min(1),
  refreshToken: z.string().min(1).nullable().optional(),
  user: genericRestUserSchema
})

const authSessionPayloadSchema = z.union([
  authSessionSchema,
  z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional(),
    user: genericRestUserSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      token: z.string().min(1).optional(),
      accessToken: z.string().min(1).optional(),
      refreshToken: z.string().min(1).nullable().optional(),
      user: genericRestUserSchema
    }).refine((value) => Boolean(value.token || value.accessToken), {
      message: 'Auth session payload requires token or accessToken'
    })
  })
])

const sessionPayloadSchema = z.union([
  authSessionSchema,
  z.object({
    user: genericRestUserSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      user: genericRestUserSchema
    })
  })
])

const refreshPayloadSchema = z.union([
  z.object({
    token: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional(),
    user: genericRestUserSchema.optional()
  }),
  z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional(),
    user: genericRestUserSchema.optional()
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      token: z.string().min(1).optional(),
      accessToken: z.string().min(1).optional(),
      refreshToken: z.string().min(1).nullable().optional(),
      user: genericRestUserSchema.optional()
    }).refine((value) => Boolean(value.token || value.accessToken), {
      message: 'Refresh payload requires token or accessToken'
    })
  })
])

const changePasswordTokenPayloadSchema = z.union([
  z.object({
    token: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional()
  }),
  z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional()
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      token: z.string().min(1).optional(),
      accessToken: z.string().min(1).optional(),
      refreshToken: z.string().min(1).nullable().optional()
    }).refine((value) => Boolean(value.token || value.accessToken), {
      message: 'Password update payload requires token or accessToken'
    })
  })
])

const normalizeRefreshPayload = (
  payload: z.infer<typeof refreshPayloadSchema>
): RefreshSessionResult => {
  if ('data' in payload) {
    return {
      token: payload.data.token ?? payload.data.accessToken ?? '',
      refreshToken: payload.data.refreshToken,
      user: payload.data.user
    }
  }

  if ('accessToken' in payload) {
    return {
      token: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user
    }
  }

  return payload
}

const normalizeChangePasswordPayload = (payload: unknown): ChangePasswordResult => {
  if (payload === null || typeof payload === 'undefined') {
    return {}
  }

  const parsed = changePasswordTokenPayloadSchema.safeParse(payload)

  if (!parsed.success) {
    return {}
  }

  const value = parsed.data

  if ('data' in value) {
    return {
      rotatedSession: {
        token: value.data.token ?? value.data.accessToken ?? '',
        refreshToken: value.data.refreshToken
      }
    }
  }

  if ('accessToken' in value) {
    return {
      rotatedSession: {
        token: value.accessToken,
        refreshToken: value.refreshToken
      }
    }
  }

  return {
    rotatedSession: {
      token: value.token,
      refreshToken: value.refreshToken
    }
  }
}

const normalizeAuthSessionPayload = (
  payload: z.infer<typeof authSessionPayloadSchema>
): AuthSession => {
  if ('data' in payload) {
    return {
      token: payload.data.token ?? payload.data.accessToken ?? '',
      refreshToken: payload.data.refreshToken,
      user: payload.data.user
    }
  }

  if ('accessToken' in payload) {
    return {
      token: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user
    }
  }

  return payload
}

const getEndpoints = () => {
  const endpoints = pmNativeConfig.backend.genericRest?.auth?.endpoints

  if (!endpoints) {
    throw new Error('Missing genericRest auth endpoints in pm-native.config.ts')
  }

  return endpoints
}

const toGenericRestAuthProviderError = (error: unknown): never => {
  if (error instanceof AuthProviderError) {
    throw error
  }

  if (
    error instanceof ApiError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'ApiError' &&
      'status' in error &&
      typeof error.status === 'number')
  ) {
    const apiError = error as ApiError

    if (apiError.status === 401 || apiError.status === 403) {
      throw new AuthProviderError(apiError.message, 'UNAUTHORIZED')
    }

    if (apiError.status === 0 || apiError.status === 408) {
      throw new AuthProviderError(apiError.message, 'PROVIDER')
    }

    throw new AuthProviderError(apiError.message, 'PROVIDER')
  }

  if (error instanceof Error) {
    if (error.message.includes('Missing genericRest auth endpoints')) {
      throw new AuthProviderError(error.message, 'CONFIG')
    }

    throw new AuthProviderError(error.message, 'PROVIDER')
  }

  throw new AuthProviderError('generic-rest auth provider request failed', 'UNKNOWN')
}

export const genericRestAuthProvider: AuthProvider = {
  getCapabilities() {
    const endpoints = pmNativeConfig.backend.genericRest?.auth.endpoints

    return {
      ...defaultAuthProviderCapabilities,
      canUpdatePassword: Boolean(endpoints?.changePassword)
    }
  },

  async login(input) {
    const endpoints = getEndpoints()
    const payload = await apiRequest<unknown, typeof authSessionPayloadSchema>(endpoints.login, {
      method: 'POST',
      body: input,
      schema: authSessionPayloadSchema,
      allowRefresh: false,
      useAuthToken: false
    })

    return normalizeAuthSessionPayload(payload)
  },

  async register(input): Promise<AuthRegisterResult> {
    const endpoints = getEndpoints()
    const payload = await apiRequest<unknown, typeof authSessionPayloadSchema>(endpoints.register, {
      method: 'POST',
      body: input,
      schema: authSessionPayloadSchema,
      allowRefresh: false,
      useAuthToken: false
    })

    return {
      kind: 'session',
      session: normalizeAuthSessionPayload(payload)
    }
  },

  async signInWithSocial() {
    throw new AuthProviderError('generic-rest social auth is not implemented yet', 'NOT_SUPPORTED')
  },

  async completeSocialAuthCallback() {
    throw new AuthProviderError('generic-rest social auth is not implemented yet', 'NOT_SUPPORTED')
  },

  async requestPasswordReset(input) {
    const endpoints = getEndpoints()

    if (!endpoints.forgotPassword) {
      throw new Error('generic-rest provider is missing auth.endpoints.forgotPassword')
    }

    await apiRequest<void>(endpoints.forgotPassword, {
      method: 'POST',
      body: input,
      allowRefresh: false,
      useAuthToken: false
    })
  },

  async updatePassword(input, context) {
    try {
      const endpoints = getEndpoints()

      if (!endpoints.changePassword) {
        throw new AuthProviderError('generic-rest direct password update is not implemented yet', 'NOT_SUPPORTED')
      }

      if (!context.accessToken) {
        throw new AuthProviderError('No access token available for direct password update', 'UNAUTHORIZED')
      }

      const payload = await apiRequest<unknown>(endpoints.changePassword, {
        method: 'POST',
        token: context.accessToken,
        body: {
          password: input.password
        },
        allowRefresh: false,
        useAuthToken: false
      })

      return normalizeChangePasswordPayload(payload)
    } catch (error) {
      throw toGenericRestAuthProviderError(error)
    }
  },

  async logout({ accessToken }) {
    if (!accessToken) {
      return
    }

    const endpoints = getEndpoints()
    await apiRequest<void>(endpoints.logout, {
      method: 'POST',
      token: accessToken,
      allowRefresh: false,
      useAuthToken: false
    })
  },

  async getSessionUser(token) {
    const endpoints = getEndpoints()
    const payload = await apiRequest<unknown, typeof sessionPayloadSchema>(endpoints.session, {
      token,
      schema: sessionPayloadSchema
    })

    if ('data' in payload) {
      return payload.data.user
    }

    return payload.user
  },

  async refreshAccessToken(refreshToken) {
    const endpoints = getEndpoints()
    const payload = await apiRequest<unknown, typeof refreshPayloadSchema>(endpoints.refresh, {
      method: 'POST',
      body: {
        refreshToken
      },
      schema: refreshPayloadSchema,
      allowRefresh: false,
      useAuthToken: false,
      retry: {
        attempts: 1,
        backoffMs: 150
      }
    })

    return normalizeRefreshPayload(payload)
  }
}
