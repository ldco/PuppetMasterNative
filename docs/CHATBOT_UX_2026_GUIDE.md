# Chatbot UX/UI 2026 Guide (Customizable + Out-of-the-Box)

Date: 2026-02-25

## What "best" means for PMNative

For this app, a strong chatbot implementation needs:

- fast out-of-the-box setup
- native mobile UX (React Native / Expo)
- deep customization (quick replies, menus, forms, workflow cards)
- ability to run with a placeholder API key in local mock mode

## 2026 ecosystem snapshot (shortlist)

1. **Stream Chat React Native**
- Strong prebuilt chat UX and SDK-level customization for message lists, channels, and UI overrides.
- Source: https://getstream.io/chat/docs/sdk/react-native/

2. **Sendbird React Native UIKit**
- Full UIKit with customizable components/theming and extension points.
- Source: https://docs.sendbird.com/docs/chat/uikit/v3/react-native/overview

3. **Botpress Webchat**
- Webchat workflow model with user-message interception / control hooks, useful for guided UX flows and embedded bots.
- Source: https://botpress.com/docs/webchat/interact/toggle-message

4. **OpenAI Apps SDK / ChatKit direction**
- Moves toward richer app-like chat surfaces and componentized interactive experiences.
- Source: https://developers.openai.com/apps-sdk/reference

5. **Rasa form-driven assistants**
- Mature slot/form concepts for structured collection and branching.
- Source: https://legacy-docs-oss.rasa.com/docs/rasa/forms

## Chosen PMNative implementation pattern

PMNative now ships an in-app **Assistant tab** that supports:

- conversational bubbles
- quick-reply chips
- menu cards with action buttons
- structured forms (text/email/number/select)
- API-key placeholder (`EXPO_PUBLIC_CHATBOT_API_KEY=PASTE_YOUR_API_KEY_HERE`) with local mock fallback
- backend proxy mode via `EXPO_PUBLIC_CHATBOT_PROXY_PATH` (recommended production path)
- direct client mode only when explicitly enabled (`EXPO_PUBLIC_CHATBOT_ALLOW_DIRECT=true`)

This gives immediate UX value with no backend dependency, while preserving a straightforward path to production model/provider integration.

## Proxy Contract (recommended)

If `EXPO_PUBLIC_CHATBOT_PROXY_PATH` is set, PMNative sends:

- `POST <EXPO_PUBLIC_API_BASE_URL><EXPO_PUBLIC_CHATBOT_PROXY_PATH>`
- body:
```json
{
  "input": "user message",
  "history": [
    { "role": "assistant", "text": "..." },
    { "role": "user", "text": "..." }
  ]
}
```

Accepted response variants:

- raw structured reply:
```json
{
  "reply": "string",
  "ui": []
}
```
- success envelope:
```json
{
  "success": true,
  "data": {
    "reply": "string",
    "ui": []
  }
}
```
- alias reply key (`message`) is also accepted in both raw/envelope forms.

## Files added/updated for this pattern

- `src/app/(tabs)/assistant.tsx`
- `src/hooks/useChatbot.ts`
- `src/services/chatbot.service.ts`
- `supabase/functions/chatbot-complete/index.ts` (server-side proxy implementation)
- `src/pm-native.config.ts` (Assistant tab enabled)
- `src/types/config.ts` + `src/utils/validation.ts` (tab schema updates)
- `.env.example` + `README.md` (chatbot env placeholders)
- `docs/SUPABASE_CHATBOT_EDGE_FUNCTION_SETUP.md` (deployment + env wiring)

## Notes

- Direct client-side API keys are for local/dev prototyping only.
- Production deployments should route model calls through a backend proxy for key security, policy controls, and auditability.
- Runtime failures in proxy/direct mode are surfaced as explicit errors (no silent fallback to mock), so outages remain visible.
