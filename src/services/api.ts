import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'

interface ApiRetryOptions {
  attempts?: number
  backoffMs?: number
}

interface ApiRequestOptions<TResponse extends z.ZodTypeAny | undefined = undefined> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string
  useAuthToken?: boolean
  schema?: TResponse
  retry?: ApiRetryOptions
  allowRefresh?: boolean
}

type GetAccessTokenHandler = () => Promise<string | null> | string | null
type RefreshAccessTokenHandler = () => Promise<string | null>

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let refreshAccessTokenHandler: RefreshAccessTokenHandler | null = null
let getAccessTokenHandler: GetAccessTokenHandler | null = null
let refreshInFlight: Promise<string | null> | null = null

export const configureApiAuthHandlers = (handlers: {
  getAccessToken?: GetAccessTokenHandler
  refreshAccessToken?: RefreshAccessTokenHandler
}): void => {
  getAccessTokenHandler = handlers.getAccessToken ?? null
  refreshAccessTokenHandler = handlers.refreshAccessToken ?? null
}

const parseError = (payload: unknown): { message: string; code: string } => {
  if (typeof payload !== 'object' || payload === null) {
    return { message: 'Request failed', code: 'REQUEST_FAILED' }
  }

  const message =
    'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : 'Request failed'

  const code =
    'code' in payload && typeof payload.code === 'string' ? payload.code : 'REQUEST_FAILED'

  return { message, code }
}

const isAbortError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

const parseResponsePayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type')
  const isJson = typeof contentType === 'string' && contentType.toLowerCase().includes('json')

  if (!isJson) {
    return null
  }

  return response.json().catch(() => null)
}

const wait = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

const getRetryDelayMs = (attempt: number, backoffMs: number): number => {
  const exponential = backoffMs * 2 ** attempt
  const jitter = Math.floor(Math.random() * 50)
  return exponential + jitter
}

const isRetriableStatus = (status: number): boolean => {
  return [408, 425, 429, 500, 502, 503, 504].includes(status)
}

const shouldRetryResponse = (
  method: ApiRequestOptions['method'],
  status: number,
  hasAttemptsLeft: boolean
): boolean => {
  if (!hasAttemptsLeft) {
    return false
  }

  // Retry only idempotent reads to avoid duplicate writes.
  if (method !== 'GET') {
    return false
  }

  return isRetriableStatus(status)
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshAccessTokenHandler) {
    return null
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessTokenHandler()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

const serializeRequestBody = (body: unknown): string | undefined => {
  if (typeof body === 'undefined') {
    return undefined
  }

  return JSON.stringify(body)
}

const performFetch = async (
  path: string,
  method: NonNullable<ApiRequestOptions['method']>,
  body: string | undefined,
  token: string | undefined
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => {
    controller.abort()
  }, pmNativeConfig.api.timeoutMs)

  try {
    return await fetch(`${pmNativeConfig.api.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutHandle)
  }
}

export const apiRequest = async <TResponse, TSchema extends z.ZodTypeAny | undefined = undefined>(
  path: string,
  options: ApiRequestOptions<TSchema> = {}
): Promise<TSchema extends z.ZodTypeAny ? z.infer<TSchema> : TResponse> => {
  const method = options.method ?? 'GET'
  const useAuthToken = options.useAuthToken ?? true
  const maxAttempts = options.retry?.attempts ?? (method === 'GET' ? 2 : 0)
  const backoffMs = options.retry?.backoffMs ?? 200
  const allowRefresh = options.allowRefresh ?? true

  let activeToken = options.token
  if (useAuthToken && !activeToken && getAccessTokenHandler) {
    const providedToken = await Promise.resolve(getAccessTokenHandler()).catch(() => null)
    activeToken = providedToken ?? undefined
  }
  let refreshTried = false
  const serializedBody =
    method === 'GET' ? undefined : serializeRequestBody(options.body)

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    const hasAttemptsLeft = attempt < maxAttempts

    let response: Response

    try {
      response = await performFetch(path, method, serializedBody, activeToken)
    } catch (error) {
      if (hasAttemptsLeft) {
        await wait(getRetryDelayMs(attempt, backoffMs))
        continue
      }

      if (isAbortError(error)) {
        throw new ApiError('Request timeout', 408, 'REQUEST_TIMEOUT')
      }

      throw new ApiError('Network request failed', 0, 'NETWORK_ERROR')
    }

    if (response.status === 401 && allowRefresh && activeToken && !refreshTried) {
      refreshTried = true
      const refreshedToken = await refreshAccessToken()

      if (refreshedToken) {
        activeToken = refreshedToken
        continue
      }
    }

    const payload: unknown = await parseResponsePayload(response)

    if (!response.ok) {
      if (shouldRetryResponse(method, response.status, hasAttemptsLeft)) {
        await wait(getRetryDelayMs(attempt, backoffMs))
        continue
      }

      const errorPayload = parseError(payload)
      throw new ApiError(errorPayload.message, response.status, errorPayload.code)
    }

    if (!options.schema) {
      return payload as TSchema extends z.ZodTypeAny ? z.infer<TSchema> : TResponse
    }

    return options.schema.parse(payload) as TSchema extends z.ZodTypeAny
      ? z.infer<TSchema>
      : TResponse
  }

  throw new ApiError('Request failed after retries', 0, 'REQUEST_RETRY_EXHAUSTED')
}
