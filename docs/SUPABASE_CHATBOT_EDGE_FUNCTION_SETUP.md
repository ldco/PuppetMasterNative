# Supabase Edge Function Setup (Assistant `/chatbot/complete`)

This guide wires PMNative Assistant to a Supabase Edge Function proxy so model keys stay server-side.

## What You Get

- Authenticated chatbot endpoint at `POST /chatbot-complete`
- Structured chatbot payloads compatible with PMNative UI blocks:
  - `quick-replies`
  - `menu`
  - `form`
- `apiRequest`-compatible error format (`{ message, code }`)

## Files

- Function implementation:
  - `supabase/functions/chatbot-complete/index.ts`

## 1) Deploy the function

From project root:

```bash
supabase functions deploy chatbot-complete
```

## 2) Configure function secrets

Set required secrets:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-key
```

Optional tuning:

```bash
supabase secrets set CHATBOT_MODEL=gpt-5.2-mini
supabase secrets set OPENAI_RESPONSES_ENDPOINT=https://api.openai.com/v1/responses
supabase secrets set CHATBOT_PROVIDER_TIMEOUT_MS=15000
```

## 3) Configure PMNative app env

In your app env (`.env`):

```bash
# Supabase edge functions base URL
EXPO_PUBLIC_API_BASE_URL=https://<your-project-ref>.supabase.co/functions/v1

# Assistant proxy path
EXPO_PUBLIC_CHATBOT_PROXY_PATH=/chatbot-complete

# Keep direct mode disabled unless you explicitly want client-side model calls
EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT=false

# Placeholder can stay (not used in proxy mode)
EXPO_PUBLIC_CHATBOT_API_KEY=PASTE_YOUR_API_KEY_HERE
```

## 4) Request contract

PMNative sends:

```json
{
  "input": "user message",
  "history": [
    { "role": "assistant", "text": "..." },
    { "role": "user", "text": "..." }
  ]
}
```

Auth:

- Requires `Authorization: Bearer <supabase_access_token>`
- Function validates token using `supabase.auth.getUser()`

## 5) Response contract

Success:

```json
{
  "success": true,
  "data": {
    "reply": "string",
    "ui": []
  }
}
```

Error:

```json
{
  "message": "human readable message",
  "code": "MACHINE_CODE"
}
```

## 6) Quick smoke test

```bash
curl -i \
  -X POST "https://<your-project-ref>.supabase.co/functions/v1/chatbot-complete" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"input":"Show me support options","history":[]}'
```

## Notes

- Proxy mode is the recommended production path.
- The function sanitizes UI blocks before returning them to the app.
- If you need strict business workflows, add server-side policy logic before returning `ui`.
