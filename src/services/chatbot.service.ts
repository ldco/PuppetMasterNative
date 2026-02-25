import { z } from 'zod'

import { pmNativeConfig } from '@/pm-native.config'
import { apiRequest } from '@/services/api'

const runtimeEnv = globalThis as {
  process?: {
    env?: Record<string, string | undefined>
  }
}

export const CHATBOT_API_KEY_PLACEHOLDER = 'PASTE_YOUR_API_KEY_HERE'
const DEFAULT_CHATBOT_ENDPOINT = 'https://api.openai.com/v1/responses'
const DEFAULT_CHATBOT_MODEL = 'gpt-5.2-mini'

export type ChatBotMessageRole = 'user' | 'assistant'

export interface ChatBotActionOption {
  id: string
  label: string
  payload: string
  description?: string
}

export interface ChatBotQuickRepliesBlock {
  type: 'quick-replies'
  title?: string
  options: ChatBotActionOption[]
}

export interface ChatBotMenuBlock {
  type: 'menu'
  title: string
  description?: string
  items: ChatBotActionOption[]
}

export type ChatBotFormFieldKind = 'text' | 'email' | 'number' | 'select'

export interface ChatBotFormSelectOption {
  label: string
  value: string
}

export interface ChatBotFormField {
  name: string
  label: string
  kind: ChatBotFormFieldKind
  required?: boolean
  placeholder?: string
  options?: ChatBotFormSelectOption[]
}

export interface ChatBotFormBlock {
  type: 'form'
  id: string
  title: string
  description?: string
  submitLabel?: string
  fields: ChatBotFormField[]
}

export type ChatBotUiBlock = ChatBotQuickRepliesBlock | ChatBotMenuBlock | ChatBotFormBlock

export interface ChatBotMessage {
  id: string
  role: ChatBotMessageRole
  text: string
  createdAt: string
  uiBlocks?: ChatBotUiBlock[]
}

export interface ChatBotRuntimeConfig {
  endpoint: string
  model: string
  apiKey: string
  proxyPath: string | null
  allowDirect: boolean
}

interface ChatBotTurnInput {
  history: ChatBotMessage[]
  userMessage: string
}

export type ChatBotRuntimeMode = 'proxy' | 'direct' | 'mock'

export interface ChatBotTurnResult {
  message: ChatBotMessage
  source: 'remote' | 'mock'
  sourceDetail: string
}

const actionOptionSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1),
  payload: z.string().min(1).optional(),
  description: z.string().min(1).optional()
})

const quickRepliesBlockSchema = z.object({
  type: z.literal('quick-replies'),
  title: z.string().min(1).optional(),
  options: z.array(actionOptionSchema).min(1)
})

const menuBlockSchema = z.object({
  type: z.literal('menu'),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  items: z.array(actionOptionSchema).min(1)
})

const formSelectOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1)
})

const formFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['text', 'email', 'number', 'select']),
  required: z.boolean().optional(),
  placeholder: z.string().min(1).optional(),
  options: z.array(formSelectOptionSchema).optional()
})

const formBlockSchema = z
  .object({
    type: z.literal('form'),
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    submitLabel: z.string().min(1).optional(),
    fields: z.array(formFieldSchema).min(1)
  })
  .superRefine((value, ctx) => {
    for (const field of value.fields) {
      if (field.kind === 'select' && (!field.options || field.options.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select fields require options.'
        })
      }
    }
  })

const structuredReplySchema = z.object({
  reply: z.string().min(1),
  ui: z.array(z.union([quickRepliesBlockSchema, menuBlockSchema, formBlockSchema])).optional()
})

const proxyReplySchema = z.union([
  structuredReplySchema,
  z.object({
    success: z.literal(true),
    data: structuredReplySchema
  }),
  z.object({
    message: z.string().min(1),
    ui: z.array(z.union([quickRepliesBlockSchema, menuBlockSchema, formBlockSchema])).optional()
  }),
  z.object({
    success: z.literal(true),
    data: z.object({
      message: z.string().min(1),
      ui: z.array(z.union([quickRepliesBlockSchema, menuBlockSchema, formBlockSchema])).optional()
    })
  })
])

const SYSTEM_PROMPT = [
  'You are a product assistant inside a mobile app.',
  'Always return a single JSON object with this shape:',
  '{"reply":"string","ui":[optional blocks]}',
  'Supported ui block types:',
  '- quick-replies => {"type":"quick-replies","title":"optional","options":[{"id":"string","label":"string","payload":"string"}]}',
  '- menu => {"type":"menu","title":"string","description":"optional","items":[{"id":"string","label":"string","payload":"string","description":"optional"}]}',
  '- form => {"type":"form","id":"string","title":"string","description":"optional","submitLabel":"optional","fields":[{"name":"string","label":"string","kind":"text|email|number|select","required":true|false,"placeholder":"optional","options":[{"label":"string","value":"string"}]}]}',
  'If no special UI is needed, omit the ui property.',
  'Never wrap JSON in markdown.'
].join('\n')

const toMessageId = (): string => {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const toIsoNow = (): string => {
  return new Date().toISOString()
}

const toActionOption = (
  value: z.infer<typeof actionOptionSchema>,
  index: number
): ChatBotActionOption => {
  return {
    id: value.id ?? `option-${index + 1}`,
    label: value.label,
    payload: value.payload ?? value.label,
    ...(value.description ? { description: value.description } : {})
  }
}

const toAssistantMessageFromStructuredReply = (
  parsedReply: z.infer<typeof structuredReplySchema>
): ChatBotMessage => {
  return {
    id: toMessageId(),
    role: 'assistant',
    text: parsedReply.reply,
    createdAt: toIsoNow(),
    ...(parsedReply.ui
      ? {
          uiBlocks: parsedReply.ui.map((block) => {
            if (block.type === 'quick-replies') {
              return {
                type: 'quick-replies',
                ...(block.title ? { title: block.title } : {}),
                options: block.options.map(toActionOption)
              } satisfies ChatBotQuickRepliesBlock
            }

            if (block.type === 'menu') {
              return {
                type: 'menu',
                title: block.title,
                ...(block.description ? { description: block.description } : {}),
                items: block.items.map(toActionOption)
              } satisfies ChatBotMenuBlock
            }

            return {
              type: 'form',
              id: block.id,
              title: block.title,
              ...(block.description ? { description: block.description } : {}),
              ...(block.submitLabel ? { submitLabel: block.submitLabel } : {}),
              fields: block.fields.map((field) => ({
                name: field.name,
                label: field.label,
                kind: field.kind,
                ...(typeof field.required === 'boolean' ? { required: field.required } : {}),
                ...(field.placeholder ? { placeholder: field.placeholder } : {}),
                ...(field.options ? { options: field.options } : {})
              }))
            } satisfies ChatBotFormBlock
          })
        }
      : {})
  }
}

const toStructuredAssistantMessage = (modelOutputText: string): ChatBotMessage => {
  const normalizedOutput = modelOutputText.trim()

  if (!normalizedOutput.startsWith('{')) {
    return {
      id: toMessageId(),
      role: 'assistant',
      text: normalizedOutput,
      createdAt: toIsoNow()
    }
  }

  const parsedValue = JSON.parse(normalizedOutput) as unknown
  const parsedReply = structuredReplySchema.parse(parsedValue)

  return toAssistantMessageFromStructuredReply(parsedReply)
}

const toNormalizedProxyPath = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  if (trimmedValue.length === 0) {
    return null
  }

  return trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`
}

const resolveRuntimeConfig = (): ChatBotRuntimeConfig => {
  const endpoint = runtimeEnv.process?.env?.EXPO_PUBLIC_CHATBOT_API_ENDPOINT ?? DEFAULT_CHATBOT_ENDPOINT
  const model = runtimeEnv.process?.env?.EXPO_PUBLIC_CHATBOT_MODEL ?? DEFAULT_CHATBOT_MODEL
  const apiKey = runtimeEnv.process?.env?.EXPO_PUBLIC_CHATBOT_API_KEY ?? CHATBOT_API_KEY_PLACEHOLDER
  const allowDirect = runtimeEnv.process?.env?.EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT?.trim().toLowerCase() === 'true'
  const proxyPathFromConfig =
    pmNativeConfig.backend.provider === 'generic-rest'
      ? pmNativeConfig.backend.genericRest?.chatbot?.endpoints.complete
      : undefined
  const proxyPath = toNormalizedProxyPath(
    runtimeEnv.process?.env?.EXPO_PUBLIC_CHATBOT_PROXY_PATH ?? proxyPathFromConfig ?? null
  )

  return {
    endpoint,
    model,
    apiKey,
    proxyPath,
    allowDirect
  }
}

const hasConfiguredApiKey = (runtimeConfig: ChatBotRuntimeConfig): boolean => {
  const normalized = runtimeConfig.apiKey.trim()
  return normalized.length > 0 && normalized !== CHATBOT_API_KEY_PLACEHOLDER
}

const hasConfiguredProxy = (runtimeConfig: ChatBotRuntimeConfig): boolean => {
  return typeof runtimeConfig.proxyPath === 'string' && runtimeConfig.proxyPath.trim().length > 0
}

const hasDirectModeEnabled = (runtimeConfig: ChatBotRuntimeConfig): boolean => {
  return runtimeConfig.allowDirect && hasConfiguredApiKey(runtimeConfig)
}

const resolveRuntimeMode = (runtimeConfig: ChatBotRuntimeConfig): ChatBotRuntimeMode => {
  if (hasConfiguredProxy(runtimeConfig)) {
    return 'proxy'
  }

  if (hasDirectModeEnabled(runtimeConfig)) {
    return 'direct'
  }

  return 'mock'
}

const extractOutputText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  if ('output_text' in payload && typeof payload.output_text === 'string') {
    const outputText = payload.output_text.trim()
    return outputText.length > 0 ? outputText : null
  }

  if ('choices' in payload && Array.isArray(payload.choices)) {
    const firstChoice = payload.choices[0]

    if (
      firstChoice &&
      typeof firstChoice === 'object' &&
      'message' in firstChoice &&
      firstChoice.message &&
      typeof firstChoice.message === 'object' &&
      'content' in firstChoice.message &&
      typeof firstChoice.message.content === 'string'
    ) {
      const outputText = firstChoice.message.content.trim()
      return outputText.length > 0 ? outputText : null
    }
  }

  if ('output' in payload && Array.isArray(payload.output)) {
    const chunks: string[] = []

    for (const outputItem of payload.output) {
      if (!outputItem || typeof outputItem !== 'object') {
        continue
      }

      if ('content' in outputItem && Array.isArray(outputItem.content)) {
        for (const contentItem of outputItem.content) {
          if (!contentItem || typeof contentItem !== 'object') {
            continue
          }

          if ('text' in contentItem && typeof contentItem.text === 'string') {
            chunks.push(contentItem.text)
          }
        }
      }
    }

    const merged = chunks.join('\n').trim()
    return merged.length > 0 ? merged : null
  }

  return null
}

const toMockAssistantMessage = (userMessage: string, reason: string): ChatBotMessage => {
  const normalizedUserMessage = userMessage.trim().toLowerCase()

  if (normalizedUserMessage.includes('support') || normalizedUserMessage.includes('contact')) {
    return {
      id: toMessageId(),
      role: 'assistant',
      text: `Running in mock mode (${reason}). Here is a support intake form you can customize.`,
      createdAt: toIsoNow(),
      uiBlocks: [
        {
          type: 'form',
          id: 'support-intake',
          title: 'Support Intake',
          description: 'Collect structured issue details before handing off to an agent.',
          submitLabel: 'Submit ticket',
          fields: [
            {
              name: 'name',
              label: 'Name',
              kind: 'text',
              required: true,
              placeholder: 'Jane Doe'
            },
            {
              name: 'email',
              label: 'Email',
              kind: 'email',
              required: true,
              placeholder: 'jane@example.com'
            },
            {
              name: 'priority',
              label: 'Priority',
              kind: 'select',
              required: true,
              options: [
                { label: 'Low', value: 'low' },
                { label: 'Normal', value: 'normal' },
                { label: 'High', value: 'high' }
              ]
            },
            {
              name: 'issue',
              label: 'Issue Summary',
              kind: 'text',
              required: true,
              placeholder: 'Describe the issue'
            }
          ]
        }
      ]
    }
  }

  if (normalizedUserMessage.includes('menu') || normalizedUserMessage.includes('plan')) {
    return {
      id: toMessageId(),
      role: 'assistant',
      text: `Running in mock mode (${reason}). This menu block demonstrates customizable action cards.`,
      createdAt: toIsoNow(),
      uiBlocks: [
        {
          type: 'menu',
          title: 'Choose a workflow',
          description: 'Use menu items to branch into guided conversations.',
          items: [
            {
              id: 'start-onboarding',
              label: 'Start Onboarding',
              payload: 'Start onboarding workflow',
              description: 'Collect profile and account goals.'
            },
            {
              id: 'upgrade-plan',
              label: 'Upgrade Plan',
              payload: 'Show upgrade plans',
              description: 'Compare plans and pricing options.'
            },
            {
              id: 'talk-to-agent',
              label: 'Talk To Agent',
              payload: 'Connect me with support',
              description: 'Escalate to a human handoff queue.'
            }
          ]
        }
      ]
    }
  }

  return {
    id: toMessageId(),
    role: 'assistant',
    text: `Running in mock mode (${reason}). Use quick replies, menu cards, and forms to build your final chatbot UX.`,
    createdAt: toIsoNow(),
    uiBlocks: [
      {
        type: 'quick-replies',
        title: 'Try one',
        options: [
          {
            id: 'open-menu',
            label: 'Show menu example',
            payload: 'Show me a chatbot menu block'
          },
          {
            id: 'open-form',
            label: 'Show form example',
            payload: 'I need support, open a form'
          },
          {
            id: 'pricing',
            label: 'Ask pricing',
            payload: 'Show pricing options and recommended plan'
          }
        ]
      }
    ]
  }
}

const toOpenAiRequestInput = (history: ChatBotMessage[], userMessage: string) => {
  return [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    ...history.map((message) => ({
      role: message.role,
      content: message.text
    })),
    {
      role: 'user',
      content: userMessage
    }
  ]
}

const toProxyHistory = (history: ChatBotMessage[]) => {
  return history.map((message) => ({
    role: message.role,
    text: message.text
  }))
}

const toAssistantMessageFromProxyPayload = (payload: unknown): ChatBotMessage => {
  const parsedPayload = proxyReplySchema.parse(payload)

  if ('reply' in parsedPayload) {
    return toAssistantMessageFromStructuredReply(parsedPayload)
  }

  if ('message' in parsedPayload) {
    return toAssistantMessageFromStructuredReply({
      reply: parsedPayload.message,
      ...(parsedPayload.ui ? { ui: parsedPayload.ui } : {})
    })
  }

  if ('reply' in parsedPayload.data) {
    return toAssistantMessageFromStructuredReply(parsedPayload.data)
  }

  return toAssistantMessageFromStructuredReply({
    reply: parsedPayload.data.message,
    ...(parsedPayload.data.ui ? { ui: parsedPayload.data.ui } : {})
  })
}

export const chatbotService = {
  createUserMessage(text: string): ChatBotMessage {
    return {
      id: toMessageId(),
      role: 'user',
      text: text.trim(),
      createdAt: toIsoNow()
    }
  },

  createWelcomeMessage(): ChatBotMessage {
    return {
      id: toMessageId(),
      role: 'assistant',
      text: 'Assistant ready. I can respond with text, quick replies, menu cards, and structured forms.',
      createdAt: toIsoNow(),
      uiBlocks: [
        {
          type: 'quick-replies',
          title: 'Get started',
          options: [
            {
              id: 'welcome-menu',
              label: 'Menu example',
              payload: 'Show me a chatbot menu block'
            },
            {
              id: 'welcome-form',
              label: 'Form example',
              payload: 'I need support, open a form'
            },
            {
              id: 'welcome-pricing',
              label: 'Pricing prompt',
              payload: 'Show pricing options and a recommendation'
            }
          ]
        }
      ]
    }
  },

  getRuntimeConfig(): ChatBotRuntimeConfig {
    return resolveRuntimeConfig()
  },

  hasConfiguredApiKey(config: ChatBotRuntimeConfig): boolean {
    return hasConfiguredApiKey(config)
  },

  hasConfiguredProxy(config: ChatBotRuntimeConfig): boolean {
    return hasConfiguredProxy(config)
  },

  getRuntimeMode(config: ChatBotRuntimeConfig): ChatBotRuntimeMode {
    return resolveRuntimeMode(config)
  },

  async completeTurn(input: ChatBotTurnInput): Promise<ChatBotTurnResult> {
    const normalizedUserMessage = input.userMessage.trim()

    if (normalizedUserMessage.length === 0) {
      throw new Error('Chat message cannot be empty.')
    }

    const runtimeConfig = resolveRuntimeConfig()
    const runtimeMode = resolveRuntimeMode(runtimeConfig)

    if (runtimeMode === 'mock') {
      const hasApiKey = hasConfiguredApiKey(runtimeConfig)

      return {
        message: toMockAssistantMessage(normalizedUserMessage, hasApiKey ? 'direct mode disabled' : 'missing API key'),
        source: 'mock',
        sourceDetail: hasApiKey
          ? 'Direct model mode is disabled. Set EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT=true to enable direct calls, or configure EXPO_PUBLIC_CHATBOT_PROXY_PATH (recommended).'
          : 'Configure EXPO_PUBLIC_CHATBOT_PROXY_PATH (recommended) or set EXPO_PUBLIC_CHATBOT_API_KEY + EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT=true for direct live responses.'
      }
    }

    if (runtimeMode === 'proxy') {
      try {
        const payload = await apiRequest<unknown>(runtimeConfig.proxyPath ?? '/chatbot/complete', {
          method: 'POST',
          body: {
            input: normalizedUserMessage,
            history: toProxyHistory(input.history)
          },
          useAuthToken: true
        })

        return {
          message: toAssistantMessageFromProxyPayload(payload),
          source: 'remote',
          sourceDetail: `proxy ${runtimeConfig.proxyPath}`
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Unexpected proxy error.'
        throw new Error(`Chat proxy request failed (${runtimeConfig.proxyPath}). ${message}`)
      }
    }

    try {
      const response = await fetch(runtimeConfig.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${runtimeConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: runtimeConfig.model,
          input: toOpenAiRequestInput(input.history, normalizedUserMessage)
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const statusMessage =
          payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          payload.error &&
          typeof payload.error === 'object' &&
          'message' in payload.error &&
          typeof payload.error.message === 'string'
            ? payload.error.message
            : 'Chat provider request failed.'

        throw new Error(`HTTP ${response.status}: ${statusMessage}`)
      }

      const outputText = extractOutputText(payload)

      if (!outputText) {
        throw new Error('Chat provider returned an empty response.')
      }

      return {
        message: toStructuredAssistantMessage(outputText),
        source: 'remote',
        sourceDetail: `${runtimeConfig.model} via ${runtimeConfig.endpoint}`
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unexpected direct-mode error.'
      throw new Error(`Direct chat request failed (${runtimeConfig.model}). ${message}`)
    }
  }
}
