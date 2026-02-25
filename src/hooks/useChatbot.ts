import { useCallback, useMemo, useState } from 'react'

import {
  CHATBOT_API_KEY_PLACEHOLDER,
  chatbotService,
  type ChatBotRuntimeMode,
  type ChatBotFormBlock,
  type ChatBotMessage
} from '@/services/chatbot.service'

interface UseChatbotResult {
  messages: ChatBotMessage[]
  composerValue: string
  isSending: boolean
  error: string | null
  sourceDetail: string
  runtimeMode: ChatBotRuntimeMode
  usesMockMode: boolean
  setComposerValue: (value: string) => void
  sendComposerMessage: () => Promise<void>
  sendActionPayload: (payload: string) => Promise<void>
  resetConversation: () => void
  getFormFieldValue: (messageId: string, formId: string, fieldName: string) => string
  setFormFieldValue: (messageId: string, formId: string, fieldName: string, value: string) => void
  getFormError: (messageId: string, formId: string) => string | null
  submitForm: (messageId: string, form: ChatBotFormBlock) => Promise<void>
}

const toFormDraftKey = (messageId: string, formId: string): string => `${messageId}:${formId}`

const toUserMessageFromForm = (form: ChatBotFormBlock, values: Record<string, string>): string => {
  const pairs = form.fields.map((field) => {
    const value = values[field.name]?.trim() ?? ''
    return `${field.label}: ${value.length > 0 ? value : '(empty)'}`
  })

  return [`Form submission (${form.id})`, ...pairs].join('\n')
}

export const useChatbot = (): UseChatbotResult => {
  const runtimeConfig = useMemo(() => chatbotService.getRuntimeConfig(), [])
  const runtimeMode = useMemo<ChatBotRuntimeMode>(
    () => chatbotService.getRuntimeMode(runtimeConfig),
    [runtimeConfig]
  )
  const usesMockMode = runtimeMode === 'mock'

  const initialSourceDetail = useMemo(() => {
    if (runtimeMode === 'proxy') {
      return `Proxy mode active: ${runtimeConfig.proxyPath}`
    }

    if (runtimeMode === 'direct') {
      return `Direct model mode: ${runtimeConfig.model} (${runtimeConfig.endpoint})`
    }

    if (chatbotService.hasConfiguredApiKey(runtimeConfig)) {
      return 'Using local demo mode. API key is configured but direct mode is disabled; set EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT=true or configure EXPO_PUBLIC_CHATBOT_PROXY_PATH.'
    }

    return `Using local demo mode. Set EXPO_PUBLIC_CHATBOT_PROXY_PATH or EXPO_PUBLIC_CHATBOT_API_KEY + EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT=true (placeholder: ${CHATBOT_API_KEY_PLACEHOLDER}).`
  }, [runtimeConfig, runtimeMode])

  const [messages, setMessages] = useState<ChatBotMessage[]>(() => [chatbotService.createWelcomeMessage()])
  const [composerValue, setComposerValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceDetail, setSourceDetail] = useState(initialSourceDetail)
  const [formDrafts, setFormDrafts] = useState<Record<string, Record<string, string>>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({})

  const sendMessage = useCallback(
    async (value: string): Promise<void> => {
      const normalizedValue = value.trim()
      if (normalizedValue.length === 0 || isSending) {
        return
      }

      const userMessage = chatbotService.createUserMessage(normalizedValue)
      const historyWithUser = [...messages, userMessage]

      setComposerValue('')
      setError(null)
      setMessages(historyWithUser)
      setIsSending(true)

      try {
        const result = await chatbotService.completeTurn({
          history: historyWithUser,
          userMessage: normalizedValue
        })

        setMessages((prev) => [...prev, result.message])
        setSourceDetail(result.sourceDetail)
      } catch (sendError) {
        const message =
          sendError instanceof Error && sendError.message.trim().length > 0
            ? sendError.message
            : 'Failed to send chatbot message.'
        setError(message)
      } finally {
        setIsSending(false)
      }
    },
    [isSending, messages]
  )

  const resetConversation = useCallback(() => {
    setMessages([chatbotService.createWelcomeMessage()])
    setComposerValue('')
    setError(null)
    setFormDrafts({})
    setFormErrors({})
    setSourceDetail(initialSourceDetail)
  }, [initialSourceDetail])

  const getFormFieldValue = useCallback((messageId: string, formId: string, fieldName: string): string => {
    const key = toFormDraftKey(messageId, formId)
    return formDrafts[key]?.[fieldName] ?? ''
  }, [formDrafts])

  const setFormFieldValue = useCallback((messageId: string, formId: string, fieldName: string, value: string) => {
    const key = toFormDraftKey(messageId, formId)
    setFormDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [fieldName]: value
      }
    }))
    setFormErrors((prev) => ({
      ...prev,
      [key]: undefined
    }))
  }, [])

  const getFormError = useCallback((messageId: string, formId: string): string | null => {
    const key = toFormDraftKey(messageId, formId)
    return formErrors[key] ?? null
  }, [formErrors])

  const submitForm = useCallback(async (messageId: string, form: ChatBotFormBlock): Promise<void> => {
    const key = toFormDraftKey(messageId, form.id)
    const values = formDrafts[key] ?? {}

    const missingRequired = form.fields.find((field) => {
      if (!field.required) {
        return false
      }

      const value = values[field.name]?.trim() ?? ''
      return value.length === 0
    })

    if (missingRequired) {
      setFormErrors((prev) => ({
        ...prev,
        [key]: `Required field missing: ${missingRequired.label}`
      }))
      return
    }

    await sendMessage(toUserMessageFromForm(form, values))
  }, [formDrafts, sendMessage])

  return {
    messages,
    composerValue,
    isSending,
    error,
    sourceDetail,
    runtimeMode,
    usesMockMode,
    setComposerValue,
    sendComposerMessage: () => sendMessage(composerValue),
    sendActionPayload: (payload: string) => sendMessage(payload),
    resetConversation,
    getFormFieldValue,
    setFormFieldValue,
    getFormError,
    submitForm
  }
}
