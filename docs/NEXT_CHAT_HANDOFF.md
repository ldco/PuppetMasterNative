# PMNative Next Chat Handoff

Last updated: 2026-02-22
Status: PMNative is now in its own repo (`ldco/PuppetMasterNative`)

## Session Snapshot (2026-02-22)

- `docs/NEXT_CHAT_HANDOFF.md` remains the canonical handoff doc in this repo (root `NEXT_CHAT_HANDOFF.md` now points here).
- PMN-021 moved from scaffold-only social auth to a working Supabase Google OAuth redirect/callback implementation.
- Follow-up review pass analyzed the newly added social auth code and fixed callback flow edge cases (see "Latest Review Pass").

## Latest Review Pass (2026-02-22)

### Scope of analysis
- Reviewed the newly added PMN-021 social auth runtime slice:
  - `supabaseAuthProvider` social OAuth start/callback completion
  - `useAuth()` social auth flow handling
  - auth screens (`login`, `register`)
  - new `oauth-callback` auth route
- Re-ran `npm run typecheck` after fixes

### Issues discovered
1. Callback completion could still succeed even when `backend.socialAuth.google` was disabled (config gating bypass on callback path).
2. `oauth-callback` screen could hang indefinitely when opened without callback URL data (spinner with no exit path).
3. Callback UX did not use the already-sent `mode` query param (`login` vs `register`) for feedback messaging.

### Fixes implemented
- Added config gating check to Supabase `completeSocialAuthCallback()` (blocks callback completion when Google social auth is disabled).
- Added missing-callback timeout handling in `src/app/(auth)/oauth-callback.tsx` to route back to login with an error toast.
- Added mode-aware success toast in `oauth-callback` (`Social sign-in completed` vs `Social registration completed`).
- Verified type safety with `npm run typecheck` after the review fixes.

### Remaining risks / TODO
- Social auth callback flow still lacks persisted "pending social auth context" validation (provider/mode correlation across redirect).
- Native social auth currently uses `Linking.openURL` (works for redirect flow, but `expo-web-browser`/auth-session UX hardening is still a future improvement).
- Real Supabase smoke test still required (Google provider config + deep-link/web callback validation).

## Ground Rules (important)

- PMNative is a new project.
- Do not optimize for backward compatibility with Puppet Master backend.
- Supabase is the default provider, but PMNative must remain backend-agnostic.
- Use provider-first contracts and config-driven behavior for new auth features (including social auth).

## Current Architecture Direction

### Backend
- Provider-based auth architecture (`AuthProvider`) is now the core contract.
- Implemented providers:
  - `supabase` (default)
  - `generic-rest` (configurable auth endpoints)
- PM backend assumptions were removed from core auth hook.
- Supabase-first provider flow is implemented locally (client + auth provider + provider selector).
- PMN-021 scaffold is started:
  - provider capabilities (`getCapabilities`)
  - provider-agnostic social auth methods (`signInWithSocial`)
  - `useAuth()` social actions and capability exposure
  - UI wiring is capability-gated (buttons hidden until providers report support)

### UI / Components
- Phase 2 component library is largely implemented:
  - atoms: complete set for current bootstrap scope
  - molecules: core set implemented
  - organisms: `LoginForm`, `RegisterForm`, `ToastContainer`, `ConfirmDialog`, `ScreenHeader` implemented
- Auth organisms/screens now have capability-gated social auth button plumbing (`Google`, `Telegram`, `VK`) with in-flight guards.

### Auth UX
- `forgot-password` screen now uses real provider method
- Supabase registration supports email-confirmation-required flow (no session returned)
- logout uses confirmation dialog and remains locally successful even if remote revoke fails
- auth hydration refresh path now recognizes provider-level unauthorized errors (not only REST `ApiError(401)`)
- Social auth runtime behavior is still disabled by default (provider capabilities return `false`; provider methods return `NOT_SUPPORTED` stubs)

## Repo Status / Recent Work

### Repository
- PMNative has been moved to its own repo and initial import was committed/pushed.
- Existing bootstrap commit: `44d13ed` (`initial`)
- PMNative import commit: `6035f3a` (`Initial PMNative app import`)

### Docs / DX updates
- `README.md` rewritten into a DX-focused onboarding README (golden path setup, env config, success checks, troubleshooting).
- `LICENSE` added (GNU GPL v3; `GPL-3.0-only`), and `package.json` now includes SPDX license metadata.
- `docs/SUPABASE_SETUP.md` extended with PMN-021 social auth prep guidance (`Google` first, capability gating for `Telegram` / `VK`).
- `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md` extended with a proposed PMN-021 social auth contract (`socialCapabilities`, `socialStart`, `socialComplete`).
- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md` updated to include social auth in MVP/auth milestone and `PMN-021`.
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md` added (scope, acceptance criteria, implementation order, risks).

## Verified

- `npm run typecheck` passes in this repo after latest changes (including PMN-021 scaffold).
- `npm run typecheck` passes after Supabase Google social auth redirect/callback implementation and review fixes.
- Admin Settings now includes backend provider/environment diagnostics UI.
- Supabase registration flow now supports email confirmation projects (no immediate session).
- PMN-021 scaffold compiles:
  - auth provider contract extended
  - `useAuth()` social methods added
  - auth forms/screens wired for capability-gated social buttons
- PMN-021 runtime slice now works in code for Supabase `google`:
  - capability-gated social start (`signInWithOAuth`)
  - callback route (`/oauth-callback`)
  - callback completion (`exchangeCodeForSession` / token fallback)

## Known Remaining Risks / TODO

### Immediate validation (recommended)
1. Run Supabase smoke test in Expo against a real project:
   - sign up (with and without email confirmation)
   - sign in
   - session hydrate
   - refresh
   - forgot password
   - sign out

### Next implementation priorities
1. PMN-060 loading/skeleton states
   - `SkeletonText`, `SkeletonCard`, `SkeletonList`, `LoadingOverlay`
2. Remaining organism item
   - `BottomSheet`
3. Tests
   - provider tests (`supabase`, `generic-rest`)
   - auth hydration/refresh edge cases
4. Out-of-the-box social auth support
   - `Google` in `supabase` provider runtime support is now implemented (capability-gated)
   - next: real Supabase smoke test for callback/deep-link flow (native + web)
   - next: persist pending social auth context across redirect (provider/mode validation)
   - `Telegram` / `VK` support via capability gating + provider adapters
   - generic-rest code support for proposed social endpoints (docs are in place)
5. Provider diagnostics / setup validation screen
   - show active provider
   - show missing env vars

## Canonical Planning Docs (read these first)

- `docs/pmnative/PMNative_Architecture_Proposal_—_React_Native_Framework_Design.md`
- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`
- `docs/pmnative/PM_Framework_Deep_Analysis_—_DNA_Extraction_for_PMNative.md`
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md`

## Current PMN-021 Code State (important)

- Social auth buttons are wired into `LoginForm` / `RegisterForm`, and remain hidden unless provider capabilities are `true`.
- `src/services/auth/providers/supabaseAuthProvider.ts` now implements `google` social auth:
  - `signInWithSocial()` returns `redirect_started` and opens provider URL
  - `completeSocialAuthCallback()` exchanges OAuth callback into a PMNative auth session
- `src/app/(auth)/oauth-callback.tsx` completes social auth and routes to tabs/login with toast feedback.
- `src/services/auth/providers/genericRestAuthProvider.ts` still returns `NOT_SUPPORTED` for social auth methods.
- `src/pm-native.config.ts` includes `backend.socialAuth` flags (default all `false`); `google` must be enabled to expose the button and callback completion.
- Next implementation target should be runtime validation + QA:
  - Supabase Google smoke test (web + native deep link)
  - pending social auth context persistence/validation
  - provider diagnostics for social auth callback config visibility
