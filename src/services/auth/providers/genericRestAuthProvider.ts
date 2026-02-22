import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'
import { AuthProviderError, defaultAuthProviderCapabilities, type AuthProvider } from '@/services/auth/provider.types'
import type { AuthRegisterResult, AuthSession, RefreshSessionResult } from '@/types/auth'

const authUserSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().int().nonnegative()]),
    email: z.string().email(),
    name: z.string().min(1).nullable(),
    role: z.enum(['master', 'admin', 'editor', 'user'])
  })
  .transform((value) => ({
    ...value,
    id: String(value.id)
  }))

const authSessionSchema = z.object({
  token: z.string().min(1),
  refreshToken: z.string().min(1).nullable().optional(),
  user: authUserSchema
})

const authSessionPayloadSchema = z.union([
  authSessionSchema,
  z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional(),
    user: authUserSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      token: z.string().min(1).optional(),
      accessToken: z.string().min(1).optional(),
      refreshToken: z.string().min(1).nullable().optional(),
      user: authUserSchema
    }).refine((value) => Boolean(value.token || value.accessToken), {
      message: 'Auth session payload requires token or accessToken'
    })
  })
])

const sessionPayloadSchema = z.union([
  authSessionSchema,
  z.object({
    user: authUserSchema
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      user: authUserSchema
    })
  })
])

const refreshPayloadSchema = z.union([
  z.object({
    token: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional(),
    user: authUserSchema.optional()
  }),
  z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).nullable().optional(),
    user: authUserSchema.optional()
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      token: z.string().min(1).optional(),
      accessToken: z.string().min(1).optional(),
      refreshToken: z.string().min(1).nullable().optional(),
      user: authUserSchema.optional()
    }).refine((value) => Boolean(value.token || value.accessToken), {
      message: 'Refresh payload requires token or accessToken'
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
  const endpoints = pmNativeConfig.backend.genericRest?.auth.endpoints

  if (!endpoints) {
    throw new Error('Missing genericRest auth endpoints in pm-native.config.ts')
  }

  return endpoints
}

export const genericRestAuthProvider: AuthProvider = {
  getCapabilities() {
    return defaultAuthProviderCapabilities
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
