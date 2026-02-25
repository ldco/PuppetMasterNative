import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

describe('chatbotService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
    vi.unmock('@/services/api')
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
    vi.unmock('@/services/api')
  })

  it('returns mock response blocks when API key is placeholder', async () => {
    process.env.EXPO_PUBLIC_CHATBOT_API_KEY = 'PASTE_YOUR_API_KEY_HERE'

    const { chatbotService } = await import('@/services/chatbot.service')

    const result = await chatbotService.completeTurn({
      history: [],
      userMessage: 'I need support'
    })

    expect(result.source).toBe('mock')
    expect(result.message.role).toBe('assistant')
    expect(result.message.uiBlocks?.some((block) => block.type === 'form')).toBe(true)
  })

  it('parses structured remote response from output_text', async () => {
    process.env.EXPO_PUBLIC_CHATBOT_API_KEY = 'test-key'
    process.env.EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT = 'true'
    process.env.EXPO_PUBLIC_CHATBOT_MODEL = 'gpt-test'
    process.env.EXPO_PUBLIC_CHATBOT_API_ENDPOINT = 'https://api.openai.com/v1/responses'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          output_text: JSON.stringify({
            reply: 'Here is a guided response.',
            ui: [
              {
                type: 'quick-replies',
                title: 'Next steps',
                options: [
                  {
                    id: 'pricing',
                    label: 'Show pricing',
                    payload: 'Show pricing options'
                  }
                ]
              }
            ]
          })
        })
    })

    vi.stubGlobal('fetch', fetchMock)

    const { chatbotService } = await import('@/services/chatbot.service')

    const result = await chatbotService.completeTurn({
      history: [],
      userMessage: 'help me choose a plan'
    })

    expect(result.source).toBe('remote')
    expect(result.message.text).toBe('Here is a guided response.')
    expect(result.message.uiBlocks).toEqual([
      {
        type: 'quick-replies',
        title: 'Next steps',
        options: [
          {
            id: 'pricing',
            label: 'Show pricing',
            payload: 'Show pricing options'
          }
        ]
      }
    ])

    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json'
      },
      body: expect.any(String)
    })
  })

  it('uses proxy contract when EXPO_PUBLIC_CHATBOT_PROXY_PATH is configured', async () => {
    process.env.EXPO_PUBLIC_CHATBOT_PROXY_PATH = '/chatbot/complete'

    const apiRequestMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        reply: 'Proxy response ready.',
        ui: [
          {
            type: 'quick-replies',
            options: [
              {
                id: 'next',
                label: 'Next',
                payload: 'next-action'
              }
            ]
          }
        ]
      }
    })

    vi.doMock('@/services/api', () => ({
      apiRequest: apiRequestMock
    }))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { chatbotService } = await import('@/services/chatbot.service')

    const result = await chatbotService.completeTurn({
      history: [],
      userMessage: 'show options'
    })

    expect(result.source).toBe('remote')
    expect(result.sourceDetail).toBe('proxy /chatbot/complete')
    expect(result.message.text).toBe('Proxy response ready.')
    expect(apiRequestMock).toHaveBeenCalledWith('/chatbot/complete', {
      method: 'POST',
      body: {
        input: 'show options',
        history: []
      },
      useAuthToken: true
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses mock mode when API key is configured but direct mode is not enabled', async () => {
    process.env.EXPO_PUBLIC_CHATBOT_API_KEY = 'test-key'

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { chatbotService } = await import('@/services/chatbot.service')

    const result = await chatbotService.completeTurn({
      history: [],
      userMessage: 'show menu'
    })

    expect(result.source).toBe('mock')
    expect(result.sourceDetail).toContain('Direct model mode is disabled')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws actionable error when direct request fails', async () => {
    process.env.EXPO_PUBLIC_CHATBOT_API_KEY = 'test-key'
    process.env.EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT = 'true'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'invalid request' } })
    })

    vi.stubGlobal('fetch', fetchMock)

    const { chatbotService } = await import('@/services/chatbot.service')

    await expect(
      chatbotService.completeTurn({
        history: [],
        userMessage: 'show menu'
      })
    ).rejects.toThrow('Direct chat request failed (')
  })

  it('throws actionable error when proxy request fails', async () => {
    process.env.EXPO_PUBLIC_CHATBOT_PROXY_PATH = '/chatbot/complete'

    const apiRequestMock = vi.fn().mockRejectedValue(new Error('proxy failed'))

    vi.doMock('@/services/api', () => ({
      apiRequest: apiRequestMock
    }))

    const { chatbotService } = await import('@/services/chatbot.service')

    await expect(
      chatbotService.completeTurn({
        history: [],
        userMessage: 'show menu'
      })
    ).rejects.toThrow('Chat proxy request failed')
  })
})
