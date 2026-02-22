# PMNative Next Chat Handoff

Last updated: 2026-02-22
Status: PMNative is now in its own repo (`ldco/PuppetMasterNative`)

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
- Admin Settings now includes backend provider/environment diagnostics UI.
- Supabase registration flow now supports email confirmation projects (no immediate session).
- PMN-021 scaffold compiles:
  - auth provider contract extended
  - `useAuth()` social methods added
  - auth forms/screens wired for capability-gated social buttons

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
   - PMN-021 scaffold is done; next implement runtime support
   - `Google` in `supabase` provider first (capability-gated)
   - callback/deep-link completion flow (native + web-compatible)
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

- Social auth buttons are wired into `LoginForm` / `RegisterForm`, but hidden unless capabilities are `true`.
- `src/services/auth/providers/supabaseAuthProvider.ts` and `src/services/auth/providers/genericRestAuthProvider.ts` currently return `NOT_SUPPORTED` for `signInWithSocial`.
- `src/pm-native.config.ts` includes `backend.socialAuth` flags (default all `false`).
- Next implementation target should be `Google` on the `supabase` provider with capability detection, then callback completion flow.
