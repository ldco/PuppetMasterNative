import { describe, expect, it } from 'vitest'

import {
  buildAuditEvent,
  createInMemoryRateLimiter,
  redactAuditText,
  resolveAuditLogMode
} from '../../supabase/functions/chatbot-complete/governance'

describe('chatbot-complete governance', () => {
  it('resolves audit mode with safe fallback', () => {
    expect(resolveAuditLogMode('none')).toBe('none')
    expect(resolveAuditLogMode('metadata')).toBe('metadata')
    expect(resolveAuditLogMode('redacted_input')).toBe('redacted_input')
    expect(resolveAuditLogMode('unknown')).toBe('metadata')
    expect(resolveAuditLogMode(undefined)).toBe('metadata')
  })

  it('redacts sensitive text fragments for audit previews', () => {
    const redacted = redactAuditText(
      'Reach me at alice@example.com and call 1234567890 for order 777777.'
    )

    expect(redacted).toContain('[email]')
    expect(redacted).toContain('[number]')
    expect(redacted).not.toContain('alice@example.com')
    expect(redacted).not.toContain('1234567890')
  })

  it('enforces in-memory per-key rate limits with window reset', () => {
    let now = 0
    const limiter = createInMemoryRateLimiter({
      windowMs: 10_000,
      maxRequests: 2,
      now: () => now
    })

    const first = limiter.check('user-1')
    const second = limiter.check('user-1')
    const third = limiter.check('user-1')

    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(1)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(0)
    expect(third.allowed).toBe(false)
    expect(third.retryAfterSeconds).toBeGreaterThan(0)

    now = 11_000
    const afterReset = limiter.check('user-1')
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(1)
  })

  it('builds audit events based on mode', () => {
    const baseContext = {
      requestId: 'req-1',
      userId: 'user-1',
      outcome: 'success',
      historyCount: 2,
      durationMs: 45,
      input: 'Contact me at admin@example.com'
    }

    expect(buildAuditEvent('none', baseContext)).toBeNull()

    const metadataEvent = buildAuditEvent('metadata', baseContext)
    expect(metadataEvent).toMatchObject({
      event: 'chatbot_proxy',
      requestId: 'req-1',
      userId: 'user-1'
    })
    expect(metadataEvent).not.toHaveProperty('inputPreview')

    const redactedEvent = buildAuditEvent('redacted_input', baseContext)
    expect(redactedEvent).toHaveProperty('inputPreview')
    expect(String(redactedEvent?.inputPreview)).toContain('[email]')
  })
})
