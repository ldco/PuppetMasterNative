# PMNative Next Chat Handoff

Last updated: 2026-02-22
Status: PMNative is now in its own repo (`ldco/PuppetMasterNative`)

## Session Snapshot (2026-02-22)

- `docs/NEXT_CHAT_HANDOFF.md` remains the canonical handoff doc in this repo (root `NEXT_CHAT_HANDOFF.md` now points here).
- PMN-021 moved from scaffold-only social auth to a working Supabase Google OAuth redirect/callback implementation.
- Follow-up review pass analyzed the newly added social auth code and fixed callback flow edge cases (see "Latest Review Pass").
- Phase 2 component gaps (`PMN-060` skeleton/loading states + `BottomSheet`) were implemented and reviewed for runtime issues.

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
- Added pending social auth context persistence + callback correlation validation (provider/mode + TTL) in `useAuth()` across OAuth redirects.
- Started next PMN-021 phase by extending Admin Settings backend diagnostics with social-auth status/callback-route visibility.
- Added runtime social callback URL preview to backend diagnostics (`ExpoLinking.createURL('/oauth-callback')`) to aid Supabase redirect allow-list setup.
- Added Google social readiness diagnostics + native/web Supabase allow-list guidance entries in Admin Settings backend diagnostics.
- Added tap-to-copy support in Admin Settings backend diagnostics for callback URL rows (runtime/web) using `expo-clipboard`.
- Added copyable Supabase redirect allow-list snippet + Google social setup checklist entries in Admin Settings backend diagnostics.
- Upgraded native Supabase social auth handoff to `expo-web-browser` auth sessions with `Linking.openURL` fallback.
- Added `docs/pmnative/PMN-021_AUTH_TEST_MATRIX.md` covering full auth regression + PMN-021 social tests (including Telegram/VK gating) and documented social-auth "continue" semantics in `PMN-021_SOCIAL_AUTH.md`.
- Verified type safety with `npm run typecheck` after the review fixes.

### Remaining risks / TODO
- Native social auth now attempts `expo-web-browser` auth sessions first, but still needs real-device validation across platforms.
- Real Supabase smoke test still required (Google provider config + deep-link/web callback validation).
- Callback validation currently relies on locally stored pending context (expected), so direct/manual callback URL opens without a started flow will be rejected and redirected to login.

## Module Refactor Pass (2026-02-22)

### Scope of analysis
- Reviewed the latest Phase 3 kickoff code for `profile`, `settings`, and `admin` modules:
  - hooks: `useProfile()`, `useSettings()`, `useAdmin()`
  - services: `profileService`, `settingsService`, `adminService`
  - screens consuming those hooks (admin settings/users, profile tab)
- Re-ran `npm run typecheck` after refactor changes

### Major issues found
1. `settingsService` had started mixing two responsibilities:
   - local preference storage
   - admin settings sync preview/payload contract building
2. `useSettings()` used component-local state + side-effect persistence, which can drift across mounted screens (no shared source of truth).
3. `profileService` / `adminService` read global auth state directly (`useAuthStore.getState()`), hiding dependencies and making future provider-backed replacements harder to test/compose.
4. `useProfile()` / `useAdmin()` did not handle async failures, which would leave loading states fragile as soon as real API calls are introduced.
5. `useProfile()` refresh path toggled `isLoading` during refresh, causing unnecessary skeleton flashes over existing content.
6. Logout/session-loss race risk: in-flight profile/admin requests could repopulate stale data after auth was cleared (request invalidation gap on no-user transitions).

### Refactors performed
- Split sync-preview/payload contract logic out of `settingsService` into a dedicated `settingsSyncService`.
- Rewrote settings state management around a shared Zustand store (`useSettingsStore`) so all screens read/write one canonical preferences state with MMKV persistence in store actions.
- Refactored `useSettings()` into a thin wrapper over the shared store (removed component-local persistence effect).
- Refactored `profileService` and `adminService` to accept explicit inputs instead of reading auth state internally.
- Reworked `useProfile()` and `useAdmin()` async flows to:
  - handle failures safely
  - expose error state
  - invalidate stale requests when auth state becomes unavailable
  - separate refresh state from initial loading state
- Updated Admin Users and Profile screens to use new error/refresh signals and avoid destructive refresh UX (overlay for admin refresh, no profile skeleton flash on refresh).

### Architectural decisions (current)
- Services should be pure domain helpers/contracts and receive required context as arguments.
- Global/session/shared UI domain state belongs in stores (Zustand), not duplicated in hook-local state.
- Preview/contract-building logic for planned backend sync should live in a dedicated sync-domain service, not in local settings persistence service.
- Hooks may orchestrate async state, but must expose explicit loading/error/refresh state to keep screens simple and future API migrations safe.
- Settings sync now has a provider-facing execution contract (`settingsSyncProvider`) separate from preview/draft builders (`settingsSyncService`); execution remains intentionally stubbed until a real endpoint is defined.

### Remaining risks / TODO
- `profileService` / `adminService` are still placeholder delay-based implementations; real provider/API contracts are still pending.
- `useAdmin()` now exposes `usersError`, but Admin Users screen only shows it as a blocking state when the list is empty; future UX may need non-blocking inline error/toast for refresh failures with existing data.
- Settings sync preview/payload is now cleanly separated, but backend sync endpoint contract is still not implemented.

## Component Review Pass (2026-02-22)

### Scope of analysis
- Reviewed newly added Phase 2 component work:
  - `PMN-060` loading/skeleton states (`SkeletonBlock`, `SkeletonText`, `SkeletonCard`, `SkeletonList`, `LoadingOverlay`)
  - `BottomSheet` organism (`PMN-054` remaining item)
- Re-ran `npm run typecheck` after fixes

### Issues discovered
1. `SkeletonBlock` could throw on some runtimes (especially web) if `AccessibilityInfo.isReduceMotionEnabled()` is unavailable.
2. `BottomSheet` swipe-close path could prematurely unmount internal state before the parent `visible` prop updated, causing controlled-component timing glitches.
3. `BottomSheet` did not handle gesture termination, which could leave the sheet partially dragged if the responder was interrupted.

### Fixes implemented
- Added safe/cached reduce-motion detection in `SkeletonBlock` (guards missing API and avoids repeated per-instance runtime queries).
- Fixed `BottomSheet` swipe-close flow to avoid premature internal unmount on gesture close.
- Added `BottomSheet` pan responder termination handling to restore the sheet/backdrop when gestures are interrupted.
- Verified type safety with `npm run typecheck`.

### Remaining risks / TODO
- `BottomSheet` is implemented as a reusable modal component but is not yet wired into any screen flow.
- `BottomSheet` gesture handling is container-level; if future content includes nested scroll views, gesture coordination may need refinement.
- Skeleton/loading components are implemented but not yet integrated into live loading states/screens.

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
- Admin Settings backend diagnostics now surfaces social-auth flags (`Google`, `Telegram`, `VK`) and callback-route readiness notes.
- Admin Settings backend diagnostics now also shows the runtime-resolved social callback URL.
- Admin Settings backend diagnostics now includes Google social readiness and Supabase callback allow-list guidance (native/web).
- Admin Settings backend diagnostics callback URL rows (runtime/web) are tappable and copy the URL to clipboard.
- Admin Settings backend diagnostics now includes copyable setup snippets:
  - Supabase redirect URL allow-list snippet (newline-separated)
  - Google social auth setup checklist (PMNative + Supabase)
- Phase 2 component gaps are now implemented in code:
  - `PMN-060`: `SkeletonText`, `SkeletonCard`, `SkeletonList`, `LoadingOverlay`
  - `PMN-054` remaining organism: `BottomSheet`
- Phase 2 integration pass has started:
  - Admin Settings "Sync settings with backend" placeholder now opens the new `BottomSheet` organism (first in-app usage)
  - `SkeletonList` is now used in Admin Users placeholder loading/refresh state
  - `LoadingOverlay` now replaces the logout spinner overlay in the user Settings tab
  - second `BottomSheet` usage added in the user Settings tab (`Theme Mode Help`)
- Phase 3 kickoff has started:
  - initial `useProfile()` hook added (local/session-backed placeholder implementation)
  - Profile tab now uses `SkeletonCard` and `LoadingOverlay` during profile load/refresh placeholder states
  - initial `useSettings()` hook added with local MMKV-backed preference persistence (notifications/analytics) and Settings tab integration
  - initial `useAdmin()` hook added (role-gated sections + placeholder user-directory loading/refresh) and integrated into existing admin screens
  - module service boundaries are now defined for profile/settings/admin (`profileService`, `settingsService`, `adminService`) and the hooks were refactored to consume them
  - Admin Settings "Sync settings with backend" sheet now renders a typed runtime sync preview (actor/provider/local prefs/admin module state) via `settingsSyncService.buildPreview()` instead of static placeholder copy
  - Admin Settings sync sheet now also exposes a copyable typed draft payload (`pmnative.settings.sync/1`) via `settingsSyncService.buildRequestDraft()`
  - module architecture cleanup pass completed:
    - shared settings state moved to Zustand (`useSettingsStore`) with persistent store actions
    - sync preview/payload builders moved to dedicated `settingsSyncService`
    - `profileService` / `adminService` now take explicit inputs (no hidden auth-store reads)
    - `useProfile()` / `useAdmin()` now expose safer async loading/refresh/error state
  - next-phase settings sync contract scaffolding started:
    - provider-facing `settingsSyncProvider` + typed provider errors/capabilities added
    - new `useSettingsSync()` hook now composes config/auth/settings + preview/draft/provider capability
    - Admin Settings sync sheet now runs against the provider contract (`Validate sync`) and reports explicit `NOT_SUPPORTED` status instead of relying on screen-local assumptions

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
1. Tests
   - provider tests (`supabase`, `generic-rest`)
   - auth hydration/refresh edge cases
2. Out-of-the-box social auth support
   - `Google` in `supabase` provider runtime support is now implemented (capability-gated)
   - next: real Supabase smoke test for callback/deep-link flow (native + web)
   - pending social auth context persistence/validation across redirect (provider/mode + TTL) is implemented
   - `Telegram` / `VK` support via capability gating + provider adapters
   - generic-rest code support for proposed social endpoints (docs are in place)
3. Provider diagnostics / setup validation screen
   - show active provider
   - show missing env vars
   - social auth status/callback route visibility is started; runtime callback URL preview is now shown
   - native/web allow-list examples + readiness hints are now shown
   - callback URL copy-to-clipboard is implemented for runtime/web rows
   - copyable Supabase allow-list snippet + Google setup checklist are now implemented
   - next: real Supabase Google smoke test (web + native deep link) and document any platform-specific callback URL quirks (including auth-session vs fallback behavior)
4. Phase 2 integration pass
   - `SkeletonList` and `LoadingOverlay` now have real in-app usages; next expand `SkeletonText`/`SkeletonCard` usage into additional screens
   - `BottomSheet` now has admin + user-facing usages; next test nested scroll/gesture interactions once a scrollable sheet use case exists
5. Phase 3 kickoff
  - `PMN-070` User Profile module kickoff is started (`useProfile()` + profile screen refinement)
  - service contract boundary is defined (`profileService`); next: replace placeholder profile service with provider/API-backed fetch/update flow
  - `PMN-071` Settings module kickoff is started (`useSettings()` + persisted local preferences)
  - settings local-state architecture is now store-backed (`useSettingsStore`) and sync contract preview logic is split into `settingsSyncService`
  - provider-facing execution contract is now scaffolded (`settingsSyncProvider`, currently stubbed per backend provider)
  - next: implement a real settings sync endpoint contract for at least one provider (likely `generic-rest` first), map `pmnative.settings.sync/1` to request/response schemas, and define conflict/merge behavior
  - `PMN-074` Admin module kickoff is started (`useAdmin()` + existing admin screen integration)
  - service contract boundary is defined (`adminService`) and hidden global-state reads were removed; next: define admin directory/settings/roles API contracts and replace placeholder directory loading with provider-backed queries

## Canonical Planning Docs (read these first)

- `docs/pmnative/PMNative_Architecture_Proposal_—_React_Native_Framework_Design.md`
- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`
- `docs/pmnative/PM_Framework_Deep_Analysis_—_DNA_Extraction_for_PMNative.md`
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md`
- `docs/pmnative/PMN-021_AUTH_TEST_MATRIX.md`

## Current PMN-021 Code State (important)

- Social auth buttons are wired into `LoginForm` / `RegisterForm`, and remain hidden unless provider capabilities are `true`.
- `src/services/auth/providers/supabaseAuthProvider.ts` now implements `google` social auth:
  - `signInWithSocial()` returns `redirect_started` for redirect-based flows and can return `session` when native auth-session returns a callback URL inline
  - `completeSocialAuthCallback()` exchanges OAuth callback into a PMNative auth session
  - redirect URL includes `provider` + `mode` query params for callback correlation
  - native flow attempts `WebBrowser.openAuthSessionAsync()` first, with `Linking.openURL` fallback
- `src/app/(auth)/oauth-callback.tsx` completes social auth and routes to tabs/login with toast feedback.
- `src/hooks/useAuth.ts` persists pending social auth context before redirect start and validates callback correlation (`provider` / `mode`, 15m TTL) before completion.
- `SocialAuthMode` (`login` / `register`) is documented as UI intent/context; provider lifecycle may still be unified sign-in/sign-up.
- `src/services/auth/providers/genericRestAuthProvider.ts` still returns `NOT_SUPPORTED` for social auth methods.
- `src/pm-native.config.ts` includes `backend.socialAuth` flags (default all `false`); `google` must be enabled to expose the button and callback completion.
- Next implementation target should be runtime validation + QA:
  - Supabase Google smoke test (web + native deep link)
  - provider diagnostics for social auth callback config visibility
  - document platform-specific auth-session/fallback behavior and any redirect URL allow-list quirks
