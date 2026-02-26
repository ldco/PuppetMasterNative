import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

import {
  extractOutputText,
  parseRequestPayload,
  parseStructuredReply,
  toOpenAiInput,
  toUpstreamErrorMessage
} from './contract.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.2-mini'
const DEFAULT_TIMEOUT_MS = 15000

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

const parseRequestBody = async (request: Request) => {
  const payload = await request.json().catch(() => null)
  return parseRequestPayload(payload)
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

    return json(200, {
      success: true,
      data: parseStructuredReply(outputText)
    })
  } catch {
    return toErrorResponse(500, 'Unexpected chatbot proxy error.', 'INTERNAL_ERROR')
  }
})
