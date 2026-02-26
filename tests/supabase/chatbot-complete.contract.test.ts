import { describe, expect, it } from 'vitest'

import {
  MAX_HISTORY_ITEMS,
  parseRequestPayload,
  parseStructuredReply,
  toUpstreamErrorMessage
} from '../../supabase/functions/chatbot-complete/contract'

describe('chatbot-complete contract', () => {
  it('validates and normalizes request payload', () => {
    expect(parseRequestPayload(null)).toBeNull()
    expect(parseRequestPayload({})).toBeNull()
    expect(parseRequestPayload({ input: '   ' })).toBeNull()

    const oversizedText = 'x'.repeat(3500)
    const history = Array.from({ length: MAX_HISTORY_ITEMS + 3 }, (_, index) => ({
      role: 'user',
      text: `${oversizedText}${index}`
    }))

    const parsed = parseRequestPayload({
      input: oversizedText,
      history
    })

    expect(parsed).not.toBeNull()
    expect(parsed?.input.length).toBe(3000)
    expect(parsed?.history).toHaveLength(MAX_HISTORY_ITEMS)
    expect(parsed?.history?.[0]?.text).toBe('x'.repeat(3000))
  })

  it('maps upstream provider errors to safe client messages', () => {
    expect(toUpstreamErrorMessage({ error: { message: 'rate limited' } })).toBe('rate limited')
    expect(toUpstreamErrorMessage({ error: {} })).toBe('Upstream provider request failed.')
    expect(toUpstreamErrorMessage('invalid')).toBe('Upstream provider request failed.')
  })

  it('sanitizes structured ui blocks and removes invalid shapes', () => {
    const outputText = JSON.stringify({
      reply: 'Here are safe options',
      ui: [
        {
          type: 'quick-replies',
          title: 'Pick one',
          options: Array.from({ length: 12 }, (_, index) => ({
            label: `Option ${index + 1}`,
            payload: `payload-${index + 1}`
          }))
        },
        {
          type: 'menu',
          items: [{ label: 'Missing title', payload: 'ignore' }]
        },
        {
          type: 'form',
          id: 'contact',
          title: 'Contact support',
          fields: [
            { name: 'email', label: 'Email', kind: 'email', required: true },
            { name: 'plan', label: 'Plan', kind: 'select', options: [] },
            {
              name: 'tier',
              label: 'Tier',
              kind: 'select',
              options: [{ label: 'Pro', value: 'pro' }]
            }
          ]
        },
        { type: 'unknown' }
      ]
    })

    const parsed = parseStructuredReply(outputText)
    expect(parsed.reply).toBe('Here are safe options')
    expect(parsed.ui).toHaveLength(2)
    expect(parsed.ui?.[0]).toMatchObject({
      type: 'quick-replies',
      title: 'Pick one'
    })
    expect(parsed.ui?.[0]?.type).toBe('quick-replies')
    if (parsed.ui?.[0]?.type === 'quick-replies') {
      expect(parsed.ui[0].options).toHaveLength(10)
      expect(parsed.ui[0].options[0]).toMatchObject({
        id: 'option-1',
        label: 'Option 1',
        payload: 'payload-1'
      })
    }

    expect(parsed.ui?.[1]?.type).toBe('form')
    if (parsed.ui?.[1]?.type === 'form') {
      expect(parsed.ui[1].fields).toHaveLength(2)
      expect(parsed.ui[1].fields[1]).toMatchObject({
        name: 'tier',
        kind: 'select'
      })
    }
  })

  it('falls back to plain reply for non-json output', () => {
    const parsed = parseStructuredReply('  plain text response  ')
    expect(parsed).toEqual({ reply: 'plain text response' })
  })
})
