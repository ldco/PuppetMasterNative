# PMN-021 — Out-of-the-Box Social Auth (`Google`, `Telegram`, `VK`)

## Goal

Add production-ready, out-of-the-box social authentication support to PMNative for:

- `Google`
- `Telegram`
- `VK`

This must support the full auth UX path a template user expects on day one:

- registration (first-time account creation via provider)
- login / sign-in (existing account via provider)
- session restore into protected screens

The implementation must follow PMNative's core philosophy:

- backend-agnostic auth contract
- Supabase-first default path
- config-driven provider visibility
- mobile-first UX with web-compatible fallback

## Why This Is Core (Not Optional Polish)

PMNative aims to be a framework a developer can clone and use immediately. For many real apps, social auth is a baseline expectation, not a later enhancement.

Shipping `Google`, `Telegram`, and `VK` out of the box improves:

- onboarding conversion
- regional coverage (especially `VK` / `Telegram`)
- time-to-first-working-auth for new projects

## Roadmap Placement

- Phase: **Phase 1 — Core Systems**
- Milestone: **M1.2 — Authentication System**
- Ticket: **`PMN-021`**

## Related Docs

- `docs/pmnative/PMN-021_AUTH_TEST_MATRIX.md` (full auth + social test matrix, including Telegram/VK gating coverage)

## Scope

### In Scope

- Social auth entry points on auth screens (`login`, `register`)
- Provider-specific actions for `Google`, `Telegram`, `VK`
- Auth provider contract extensions required for OAuth/social flows
- Native callback/deep-link handling
- Web-compatible callback flow (React Native Web / Expo web)
- Session persistence/hydration after social auth completion
- Provider capability detection (show/hide unsupported providers)
- Structured error handling for common OAuth failures

### Out of Scope (for PMN-021)

- Apple Sign In (track separately)
- Phone OTP / SMS auth
- Enterprise SSO (SAML/OIDC admin setup flows)
- Provider analytics instrumentation
- Advanced account linking/merge UI (basic backend-driven linking only)

## UX Requirements

### Social Auth Lifecycle Semantics (Important)

For social providers (`Google`, `Telegram`, `VK`), PMNative should treat auth as a unified "continue with provider" flow:

- first successful provider auth may create the PMNative account and sign the user in
- later provider auth signs the same user in again

This differs from email/password auth, where `register` and `login` are typically separate backend operations.

Implications:

- `login` and `register` screen social buttons are UI entry points / user intent
- both should call provider-agnostic social auth actions
- the provider/backend decides whether the user is first-time (create+sign-in) or returning (sign-in)
- PMNative may still pass intent (`login` / `register`) for UX copy, analytics, and callback correlation

### Auth Screens

Both `login` and `register` screens must expose social auth actions when enabled and supported.

Minimum UX behavior:

- Show social buttons only when provider is configured and supported by the active auth backend
- Preserve email/password auth as the default baseline flow
- Prevent duplicate submissions while a social auth request is in-flight
- Show clear, typed error messages (cancelled, unavailable, config missing, network error)
- Successful social auth from either screen should end in an authenticated session (no forced "register then login" sequence)

### Expected Buttons (when supported)

- `Continue with Google`
- `Continue with Telegram`
- `Continue with VK`

Label wording may be localized later, but semantics must be consistent across providers.

## Configuration Model (Proposed)

Social auth availability should be config-driven and backend/provider-aware.

Example shape (illustrative, final shape may vary):

```ts
backend: {
  provider: 'supabase',
  socialAuth: {
    google: true,
    telegram: true,
    vk: true,
  },
}
```

Requirements:

- Defaults should be safe (`false` if env/provider setup is incomplete)
- `useConfig()` should expose derived booleans for UI rendering
- Missing config should not crash the app; unsupported providers should be hidden or return typed errors

## Auth Provider Contract Changes (Required)

The provider contract must support social auth without leaking backend-specific details into screens/components.

### Proposed Contract Additions (Illustrative)

```ts
type SocialAuthProvider = 'google' | 'telegram' | 'vk'

interface AuthProvider {
  // existing methods...
  getCapabilities?: () => {
    socialAuth?: Partial<Record<SocialAuthProvider, boolean>>
  }
  signInWithSocial?: (provider: SocialAuthProvider) => Promise<AuthSessionResult>
  completeSocialAuth?: (params: {
    url: string
  }) => Promise<AuthSessionResult | null>
}
```

Notes:

- Screen code should call a provider-agnostic method (`signInWithSocial`)
- Provider capability checks should prevent unsupported actions from rendering or executing
- Errors should remain normalized (typed app-level auth/API errors)
- Any `mode` / `intent` parameter is UI-level context, not a guarantee of separate provider-side register vs login operations

## Backend/Provider Strategy Notes

### Supabase (Default Path)

PMNative is Supabase-first, so the initial happy path should prioritize Supabase integration.

Requirements:

- Implement `Google` first in Supabase provider if backend/provider support is immediately available
- `Telegram` and `VK` should be exposed when supported by configured backend/provider flow
- If a provider is not supported by the active Supabase setup, PMNative must:
  - hide the button, or
  - return a typed `NOT_SUPPORTED` error (no raw SDK errors to UI)

Important:

- Do not hardcode Supabase assumptions into `useAuth()` or screen components
- Keep social auth backend-specific logic inside provider adapters

### Generic REST Provider

Support must remain possible via `generic-rest` by extending the auth provider adapter and contract documentation.

Expected adapter behavior:

- start auth flow
- receive callback result / token exchange result
- normalize session payload into PMNative auth state

Follow-up docs work:

- extend `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md` with social auth endpoints/payloads when implementation begins

## Acceptance Criteria

### Functional

- [ ] `login` screen renders social auth actions for configured/supported providers
- [ ] `register` screen renders social auth actions for configured/supported providers
- [ ] `Google` flow works end-to-end on the default backend path (Supabase-first)
- [ ] Social auth success from either `login` or `register` screen results in an authenticated session (provider may create+sign-in on first use)
- [ ] `Telegram` flow is supported via provider contract (implemented or explicitly capability-gated)
- [ ] `VK` flow is supported via provider contract (implemented or explicitly capability-gated)
- [ ] Successful social auth creates/restores a session and lands on protected app screens
- [ ] Session hydration works after app restart for social-authenticated users
- [ ] Logout clears local session state after social auth exactly like email/password auth

### DX / Architecture

- [ ] No social-auth backend logic leaks into screen components (`login`, `register`)
- [ ] Auth screens consume provider-agnostic `useAuth()` API
- [ ] Provider capability detection is typed and config-driven
- [ ] Unsupported providers fail gracefully (hidden UI or typed error)
- [ ] TypeScript passes with no contract type regressions

### UX / Reliability

- [ ] Duplicate social auth taps are prevented while request is in-flight
- [ ] User cancellation produces a non-crashing, user-readable outcome
- [ ] Network/provider failures map to structured errors
- [ ] Callback/deep-link edge cases do not leave partial/stale auth state

## Implementation Notes (Recommended Order)

1. Extend auth provider types/capabilities for social auth.
2. Add `useAuth()` social auth actions and typed error mapping.
3. Add social auth UI hooks/buttons to `LoginForm` and `RegisterForm`.
4. Implement Supabase provider support (start with `Google` happy path).
5. Add callback/deep-link completion flow and session hydration validation.
6. Add provider tests for capability gating and session normalization.
7. Update setup docs (`SUPABASE_SETUP`, generic REST contract) with provider-specific requirements.

## Risks / Watchouts

- Provider support varies by backend and project configuration; capability gating must be first-class.
- OAuth callback/deep-link handling differs between native and web; keep the flow adapter-owned where possible.
- Social login may return incomplete profile fields; auth/user normalization must remain tolerant and validated.
- Avoid imposing email/password-style "register first, login later" assumptions onto social provider flows.
- Avoid regressing existing email/password flows while extending `useAuth()`.
