import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

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

const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.2-mini'
const DEFAULT_TIMEOUT_MS = 15000
const MAX_HISTORY_ITEMS = 24
const MAX_INPUT_LENGTH = 3000
const MAX_BLOCKS = 6
const MAX_OPTIONS = 10
const MAX_FIELDS = 8

type MessageRole = 'user' | 'assistant'
type FormFieldKind = 'text' | 'email' | 'number' | 'select'

interface ChatHistoryItem {
  role: MessageRole
  text: string
}

interface ChatCompleteRequest {
  input: string
  history?: ChatHistoryItem[]
}

interface ActionOption {
  id: string
  label: string
  payload: string
  description?: string
}

interface QuickRepliesBlock {
  type: 'quick-replies'
  title?: string
  options: ActionOption[]
}

interface MenuBlock {
  type: 'menu'
  title: string
  description?: string
  items: ActionOption[]
}

interface FormFieldOption {
  label: string
  value: string
}

interface FormField {
  name: string
  label: string
  kind: FormFieldKind
  required?: boolean
  placeholder?: string
  options?: FormFieldOption[]
}

interface FormBlock {
  type: 'form'
  id: string
  title: string
  description?: string
  submitLabel?: string
  fields: FormField[]
}

type UiBlock = QuickRepliesBlock | MenuBlock | FormBlock

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toLimitedString = (value: string, max: number): string => {
  return value.length > max ? value.slice(0, max) : value
}

const json = (status: number, payload: unknown): Response => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  })
}

const toErrorResponse = (status: number, message: string, code: string): Response => {
  return json(status, { message, code })
}

const parseBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('Authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

const parseRequestBody = async (request: Request): Promise<ChatCompleteRequest | null> => {
  const body = await request.json().catch(() => null)
  if (!isRecord(body)) {
    return null
  }

  const input = toStringValue(body.input)
  if (!input) {
    return null
  }

  const history: ChatHistoryItem[] = []
  if (Array.isArray(body.history)) {
    const slice = body.history.slice(-MAX_HISTORY_ITEMS)
    for (const item of slice) {
      if (!isRecord(item)) {
        continue
      }

      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
      const text = toStringValue(item.text)
      if (!role || !text) {
        continue
      }

      history.push({
        role,
        text: toLimitedString(text, MAX_INPUT_LENGTH)
      })
    }
  }

  return {
    input: toLimitedString(input, MAX_INPUT_LENGTH),
    history
  }
}

const toOpenAiInput = (history: ChatHistoryItem[], input: string) => {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((item) => ({
      role: item.role,
      content: item.text
    })),
    { role: 'user', content: input }
  ]
}

const extractOutputText = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    return null
  }

  if (typeof payload.output_text === 'string') {
    const outputText = payload.output_text.trim()
    return outputText.length > 0 ? outputText : null
  }

  const output = payload.output
  if (!Array.isArray(output)) {
    return null
  }

  const chunks: string[] = []
  for (const outputItem of output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue
    }

    for (const contentItem of outputItem.content) {
      if (!isRecord(contentItem) || typeof contentItem.text !== 'string') {
        continue
      }

      if (contentItem.text.trim().length > 0) {
        chunks.push(contentItem.text)
      }
    }
  }

  const merged = chunks.join('\n').trim()
  return merged.length > 0 ? merged : null
}

const normalizeActionOptions = (value: unknown): ActionOption[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: ActionOption[] = []
  const sliced = value.slice(0, MAX_OPTIONS)
  for (let index = 0; index < sliced.length; index += 1) {
    const option = sliced[index]
    if (!isRecord(option)) {
      continue
    }

    const label = toStringValue(option.label)
    if (!label) {
      continue
    }

    const id = toStringValue(option.id) ?? `option-${index + 1}`
    const payload = toStringValue(option.payload) ?? label
    const description = toStringValue(option.description) ?? undefined

    normalized.push({
      id,
      label,
      payload,
      ...(description ? { description } : {})
    })
  }

  return normalized
}

const normalizeFormFieldOptions = (value: unknown): FormFieldOption[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: FormFieldOption[] = []
  for (const option of value) {
    if (!isRecord(option)) {
      continue
    }

    const label = toStringValue(option.label)
    const val = toStringValue(option.value)
    if (!label || !val) {
      continue
    }

    normalized.push({ label, value: val })
  }

  return normalized
}

const normalizeFormFields = (value: unknown): FormField[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: FormField[] = []
  const sliced = value.slice(0, MAX_FIELDS)
  for (const field of sliced) {
    if (!isRecord(field)) {
      continue
    }

    const name = toStringValue(field.name)
    const label = toStringValue(field.label)
    const kind = field.kind

    if (!name || !label || !['text', 'email', 'number', 'select'].includes(String(kind))) {
      continue
    }

    const options = normalizeFormFieldOptions(field.options)
    if (kind === 'select' && options.length === 0) {
      continue
    }

    normalized.push({
      name,
      label,
      kind: kind as FormFieldKind,
      ...(typeof field.required === 'boolean' ? { required: field.required } : {}),
      ...(toStringValue(field.placeholder) ? { placeholder: toStringValue(field.placeholder)! } : {}),
      ...(options.length > 0 ? { options } : {})
    })
  }

  return normalized
}

const normalizeUiBlocks = (value: unknown): UiBlock[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: UiBlock[] = []
  const sliced = value.slice(0, MAX_BLOCKS)

  for (const block of sliced) {
    if (!isRecord(block) || typeof block.type !== 'string') {
      continue
    }

    if (block.type === 'quick-replies') {
      const options = normalizeActionOptions(block.options)
      if (options.length === 0) {
        continue
      }

      normalized.push({
        type: 'quick-replies',
        ...(toStringValue(block.title) ? { title: toStringValue(block.title)! } : {}),
        options
      })
      continue
    }

    if (block.type === 'menu') {
      const title = toStringValue(block.title)
      const items = normalizeActionOptions(block.items)
      if (!title || items.length === 0) {
        continue
      }

      normalized.push({
        type: 'menu',
        title,
        ...(toStringValue(block.description) ? { description: toStringValue(block.description)! } : {}),
        items
      })
      continue
    }

    if (block.type === 'form') {
      const id = toStringValue(block.id)
      const title = toStringValue(block.title)
      const fields = normalizeFormFields(block.fields)
      if (!id || !title || fields.length === 0) {
        continue
      }

      normalized.push({
        type: 'form',
        id,
        title,
        ...(toStringValue(block.description) ? { description: toStringValue(block.description)! } : {}),
        ...(toStringValue(block.submitLabel) ? { submitLabel: toStringValue(block.submitLabel)! } : {}),
        fields
      })
    }
  }

  return normalized
}

const parseStructuredReply = (outputText: string): { reply: string; ui?: UiBlock[] } => {
  const trimmed = outputText.trim()
  if (!trimmed.startsWith('{')) {
    return {
      reply: toLimitedString(trimmed, MAX_INPUT_LENGTH)
    }
  }

  const parsed = JSON.parse(trimmed) as unknown
  if (!isRecord(parsed)) {
    return {
      reply: toLimitedString(trimmed, MAX_INPUT_LENGTH)
    }
  }

  const reply = toStringValue(parsed.reply) ?? toStringValue(parsed.message)
  if (!reply) {
    return {
      reply: toLimitedString(trimmed, MAX_INPUT_LENGTH)
    }
  }

  const ui = normalizeUiBlocks(parsed.ui)
  return {
    reply: toLimitedString(reply, MAX_INPUT_LENGTH),
    ...(ui.length > 0 ? { ui } : {})
  }
}

const toUpstreamErrorMessage = (payload: unknown): string => {
  if (!isRecord(payload) || !isRecord(payload.error) || typeof payload.error.message !== 'string') {
    return 'Upstream provider request failed.'
  }

  return payload.error.message
}

const getRequiredEnv = (name: string): string | null => {
  const value = Deno.env.get(name)
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const getTimeoutMs = (): number => {
  const value = Deno.env.get('CHATBOT_PROVIDER_TIMEOUT_MS')
  if (!value) {
    return DEFAULT_TIMEOUT_MS
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.floor(parsed)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: CORS_HEADERS
    })
  }

  if (request.method !== 'POST') {
    return toErrorResponse(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED')
  }

  try {
    const token = parseBearerToken(request)
    if (!token) {
      return toErrorResponse(401, 'Missing bearer token.', 'UNAUTHORIZED')
    }

    const supabaseUrl = getRequiredEnv('SUPABASE_URL')
    const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return toErrorResponse(500, 'Supabase environment is not configured.', 'CONFIG_ERROR')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return toErrorResponse(401, 'Invalid or expired token.', 'UNAUTHORIZED')
    }

    const body = await parseRequestBody(request)
    if (!body) {
      return toErrorResponse(400, 'Invalid request body. Expected { input, history? }.', 'INVALID_REQUEST')
    }

    const openAiApiKey = getRequiredEnv('OPENAI_API_KEY')
    if (!openAiApiKey) {
      return toErrorResponse(500, 'OPENAI_API_KEY is not configured.', 'CONFIG_ERROR')
    }

    const providerEndpoint = getRequiredEnv('OPENAI_RESPONSES_ENDPOINT') ?? DEFAULT_OPENAI_ENDPOINT
    const providerModel = getRequiredEnv('CHATBOT_MODEL') ?? DEFAULT_MODEL
    const timeoutMs = getTimeoutMs()
    const controller = new AbortController()
    const timeoutHandle = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    let providerResponse: Response

    try {
      providerResponse = await fetch(providerEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: providerModel,
          input: toOpenAiInput(body.history ?? [], body.input),
          metadata: {
            source: 'pmnative-supabase-edge',
            userId: user.id
          }
        }),
        signal: controller.signal
      })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        return toErrorResponse(504, 'Chat provider timed out.', 'UPSTREAM_TIMEOUT')
      }

      return toErrorResponse(502, 'Chat provider network error.', 'UPSTREAM_NETWORK_ERROR')
    } finally {
      clearTimeout(timeoutHandle)
    }

    const providerPayload = await providerResponse.json().catch(() => null)

    if (!providerResponse.ok) {
      const message = toUpstreamErrorMessage(providerPayload)
      return toErrorResponse(502, message, 'UPSTREAM_ERROR')
    }

    const outputText = extractOutputText(providerPayload)
    if (!outputText) {
      return toErrorResponse(502, 'Chat provider returned an empty response.', 'UPSTREAM_EMPTY_RESPONSE')
    }

    const structured = parseStructuredReply(outputText)

    return json(200, {
      success: true,
      data: structured
    })
  } catch {
    return toErrorResponse(500, 'Unexpected chatbot proxy error.', 'INTERNAL_ERROR')
  }
})
