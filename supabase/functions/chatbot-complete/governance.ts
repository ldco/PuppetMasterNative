export type AuditLogMode = 'none' | 'metadata' | 'redacted_input'

export const DEFAULT_AUDIT_LOG_MODE: AuditLogMode = 'metadata'

const MAX_AUDIT_INPUT_PREVIEW_LENGTH = 220

interface RateLimiterConfig {
  windowMs: number
  maxRequests: number
  now?: () => number
}

interface RateLimiterState {
  windowStartedAt: number
  count: number
}

export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

export interface AuditLogContext {
  requestId: string
  userId: string
  outcome: string
  historyCount: number
  durationMs: number
  errorCode?: string
  input?: string
  rateLimit?: {
    limit: number
    remaining: number
    retryAfterSeconds: number
  }
}

const clampPositiveInt = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback
  }

  return Math.floor(value)
}

export const resolveAuditLogMode = (value: string | null | undefined): AuditLogMode => {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'none' || normalized === 'metadata' || normalized === 'redacted_input') {
    return normalized
  }

  return DEFAULT_AUDIT_LOG_MODE
}

export const redactAuditText = (input: string): string => {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\d{6,}\b/g, '[number]')
    .slice(0, MAX_AUDIT_INPUT_PREVIEW_LENGTH)
}

export const buildAuditEvent = (
  mode: AuditLogMode,
  context: AuditLogContext
): Record<string, unknown> | null => {
  if (mode === 'none') {
    return null
  }

  return {
    event: 'chatbot_proxy',
    requestId: context.requestId,
    userId: context.userId,
    outcome: context.outcome,
    historyCount: context.historyCount,
    durationMs: context.durationMs,
    ...(context.errorCode ? { errorCode: context.errorCode } : {}),
    ...(context.rateLimit ? { rateLimit: context.rateLimit } : {}),
    ...(mode === 'redacted_input' && context.input
      ? { inputPreview: redactAuditText(context.input) }
      : {})
  }
}

export const createInMemoryRateLimiter = (config: RateLimiterConfig) => {
  const windowMs = clampPositiveInt(config.windowMs, 60_000)
  const maxRequests = clampPositiveInt(config.maxRequests, 20)
  const now = config.now ?? Date.now
  const state = new Map<string, RateLimiterState>()

  return {
    check: (key: string): RateLimitDecision => {
      const timestamp = now()
      const current = state.get(key)

      if (!current || timestamp - current.windowStartedAt >= windowMs) {
        state.set(key, { windowStartedAt: timestamp, count: 1 })
        return {
          allowed: true,
          limit: maxRequests,
          remaining: Math.max(0, maxRequests - 1),
          retryAfterSeconds: 0
        }
      }

      if (current.count >= maxRequests) {
        const retryAfterMs = Math.max(0, windowMs - (timestamp - current.windowStartedAt))
        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
        }
      }

      current.count += 1
      state.set(key, current)

      return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - current.count),
        retryAfterSeconds: 0
      }
    }
  }
}
