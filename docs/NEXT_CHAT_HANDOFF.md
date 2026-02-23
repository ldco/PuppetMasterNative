# PMNative Next Chat Handoff

Last updated: 2026-02-23
Status: PMNative is now in its own repo (`ldco/PuppetMasterNative`)

Planning note:
- Canonical current roadmap + immediate next-step list now lives in `docs/pmnative/ROADMAP.md`.
- This handoff file is for session history, implementation notes, and review findings.

## Session Update (2026-02-23, review pass: PMN-070 direct password update flow)

### Current status
- Reviewed the newly added `PMN-070` direct password update slice (`useAuth.changePassword()`, auth provider contract expansion, and `(tabs)/change-password` UI updates).
- Added hook-level tests for `useAuth.changePassword()` rotated-token persistence behavior.
- One UI concurrency issue was found and fixed in the new `Change Password` screen.

### Scope of analysis
- `src/app/(tabs)/change-password.tsx`
- `src/hooks/useAuth.ts`
- `src/services/auth/provider.ts`
- `src/services/auth/provider.types.ts`
- `src/services/auth/providers/supabaseAuthProvider.ts`
- `src/services/auth/providers/genericRestAuthProvider.ts`
- `src/types/auth.ts`
- `src/utils/validation.ts`
- `tests/hooks/useAuth.test.ts`
- `docs/pmnative/ROADMAP.md`
- `docs/NEXT_CHAT_HANDOFF.md`

### Issues discovered
- `src/app/(tabs)/change-password.tsx`
  - Direct password update and reset-link actions could be triggered concurrently because each button only disabled itself, creating overlapping auth requests/toasts and inconsistent UX.

### Fixes implemented
- Added cross-action busy gating on the `Change Password` screen so direct update and reset-link flows cannot run at the same time (`isBusy` shared gating for both buttons).
- Added `tests/hooks/useAuth.test.ts` coverage for:
  - rotated access/refresh token persistence after `changePassword()`
  - rotated refresh-token removal (`null`)
  - unauthorized guard when no active session exists
- Validation after fixes:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`20` tests)

### Completed work
- Auth provider contract now includes `updatePassword(...)` with Supabase implementation and generic-rest `NOT_SUPPORTED` fallback.
- `useAuth.changePassword()` persists rotated tokens to secure storage and updates the auth store.
- `Change Password` screen now supports Supabase-first direct password update plus reset-link fallback.
- Hook tests now cover both profile-save and auth password-change token-rotation persistence paths.

### Open tasks
- Add provider-level unit tests for `supabaseAuthProvider.updatePassword()` and `genericRestAuthProvider.updatePassword()` behavior/error mapping.
- Continue `PMN-070` with avatar upload and portable/generic-rest direct password update contracts.
- Run live Supabase smoke validation later (password update + token rotation behavior on device/web).

### Recommended next step
- Expand mocked auth-provider tests next (Supabase password update success/error/unauthorized paths and generic-rest `NOT_SUPPORTED`) before moving into live Supabase smoke validation.

### Remaining risks / TODO
- Direct password update UI is currently provider-specific (`supabase` check via config); if another provider gains support later, UI should move to capability-based gating instead of provider-name checks.
- Supabase token rotation behavior during `setSession()` + `updateUser({ password })` still needs live runtime verification.

## Session Update (2026-02-23, review pass: PMN-070 profile + README/docs)

### Current status
- Reviewed the newly added `PMN-070` profile changes (`avatarUrl`, change-password reset-link screen) plus README documentation updates.
- No functional regressions were found in the provider/service/hook test-covered paths after review validation.
- One code-quality/type-safety issue was fixed in the new profile-to-change-password navigation path.
- Changes are still uncommitted at this point in the working tree (commit/push requested next).

### Scope of analysis
- Profile module changes:
  - `src/app/(tabs)/profile.tsx`
  - `src/app/(tabs)/change-password.tsx`
  - `src/app/(tabs)/_layout.tsx`
  - `src/hooks/useProfile.ts`
  - `src/services/profile.*`
  - `src/services/genericRest.schemas.ts`
  - `src/services/auth/providers/supabaseAuthProvider.ts`
  - profile-related tests
- Documentation changes:
  - `README.md`
  - `docs/pmnative/ROADMAP.md`
  - `docs/NEXT_CHAT_HANDOFF.md`

### Issues discovered
- `src/app/(tabs)/profile.tsx`
  - The new "Change password" navigation used `router.push('/change-password' as never)`, which suppressed Expo Router typed-route checks and could hide future route-string mistakes.

### Fixes implemented
- Replaced the unsafe route cast with a typed relative route navigation:
  - `router.push('./change-password')` in `src/app/(tabs)/profile.tsx`
- Re-ran validation after the fix:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`17` tests)

### Completed work (this review pass)
- Reviewed recent `PMN-070` profile/avatar URL contract expansion and hidden tabs-route change-password screen.
- Reviewed README updates (logo path, project status, docs index, prerequisites versions).
- Applied the safe navigation type-safety fix in the profile screen and revalidated.

### Open tasks
- Commit and push the current working tree changes to `master`.
- Continue `PMN-070` toward a real avatar-upload flow and/or a true in-session password update form.
- Run live Supabase smoke validation later for profile token rotation and social auth callbacks (final integration phase).

### Recommended next step
- After commit/push, continue `PMN-070` with either (1) avatar upload UX/storage contract design or (2) a true authenticated password-change form (provider contract + UI), keeping the current reset-link screen as fallback.

### Remaining risks / TODO
- Expo Router generated typed routes (`.expo/types/router.d.ts`) may be stale until the next route typegen refresh/dev startup; runtime route works, but generated route unions may lag newly added screens temporarily.
- `tests/hooks/useProfile.test.ts` uses a custom mocked React hook runtime (pragmatic for current dependency set); consider migrating to a standard hook renderer later if test complexity grows.

## Session Update (2026-02-23, latest working-tree snapshot)

### Current status
- Continuing roadmap work on `PMN-070` (profile module hardening), non-UI.
- Supabase profile-save token rotation propagation is implemented in code and validated locally.
- Hook-level tests now cover rotated-session token persistence side effects in `useProfile()`.
- Profile editing is no longer display-name-only: `avatarUrl` is now supported across auth/profile normalization, provider/service contracts, `useProfile()`, and the profile tab UI (manual URL entry; upload flow still pending).
- Profile tab now links to a hidden tabs-route `Change Password` screen with:
  - Supabase-first direct authenticated password update (`useAuth.changePassword()` -> `authProvider.updatePassword()`)
  - reset-link fallback via `useAuth.requestPasswordReset()`
- Hook-level tests now also cover `useAuth.changePassword()` rotated-token persistence to secure storage + auth store.
- Changes are currently uncommitted in the working tree.

### Current uncommitted work (latest)
- `src/app/(tabs)/_layout.tsx`
- `src/services/profile.provider.types.ts`
- `src/services/profile.provider.ts`
- `src/services/profile.service.ts`
- `src/services/genericRest.schemas.ts`
- `src/services/auth/providers/supabaseAuthProvider.ts`
- `src/services/auth/providers/genericRestAuthProvider.ts`
- `src/services/auth/provider.types.ts`
- `src/services/auth/provider.ts`
- `src/hooks/useProfile.ts`
- `src/hooks/useAuth.ts`
- `src/types/auth.ts`
- `src/utils/validation.ts`
- `src/app/(tabs)/profile.tsx`
- `src/app/(tabs)/change-password.tsx`
- `tests/services/profile.provider.test.ts`
- `tests/services/profile.service.test.ts`
- `tests/hooks/useProfile.test.ts`
- `tests/hooks/useAuth.test.ts`
- `tests/services/settingsSync.provider.test.ts` (expectation aligned to intentional unsupported text)
- `docs/pmnative/ROADMAP.md`
- `docs/NEXT_CHAT_HANDOFF.md`

### Validation (latest)
- `npm run typecheck` passed
- `npm test -- --run` passed (`20` tests)

### Recommended next step
- Continue `PMN-070` from name+avatarUrl editing + Supabase-first direct password update toward a real avatar-upload flow and portable/generic-rest password update contracts, while keeping live Supabase smoke validation for token rotation behavior in the final integration pass.

## Session Update (2026-02-23, review comments pass)

### Scope of work
- Implemented review comments focused on unsupported-provider behavior, docs consistency, and route tooling safety.
- Updated admin/settings flows to respect provider capabilities instead of exposing unsupported actions by default.
- Restored Expo Router Babel plugin after a follow-up review comment.

### Changes completed
- Admin module capability gating (`PMN-074` scaffolding hardening)
  - Added a `supabase` admin provider stub in `src/services/admin.provider.ts` (safe placeholder, no `NOT_SUPPORTED` throws on direct provider calls).
  - `useAdmin()` now exposes admin provider capabilities and filters out the `users` admin section when remote user listing is unsupported.
  - Admin users screens now gate unsupported routes/actions:
    - `src/app/(admin)/users.tsx` shows unsupported state when remote listing is unavailable.
    - `src/app/(admin)/users/[id].tsx` shows unsupported state when remote detail is unavailable.
    - refresh/navigation actions are hidden/disabled when unsupported.
- Settings sync capability gating (`PMN-071` scaffolding hardening)
  - `useSettingsSync()` now short-circuits execution when provider capability says sync is not executable.
  - `src/app/(admin)/settings.tsx` disables/hides sync actions and labels the feature as unsupported when `canExecute = false`.
  - `supabase` settings sync remains intentionally unsupported (documented and surfaced via provider detail text).
- Documentation cleanup
  - `README.md` now documents `npm test` and `npm run test:watch`.
  - Removed outdated README note claiming no automated test script exists.
  - `docs/pmnative/ROADMAP.md` is now the canonical current-status + immediate-next-steps doc.
  - `docs/NEXT_CHAT_HANDOFF.md` is explicitly treated as session history / review notes.
- Test coverage progression
  - Added `tests/services/profile.provider.test.ts` (generic-rest normalization + Supabase error mapping coverage).
- Expo Router tooling
  - Restored `expo-router/babel` in `babel.config.js` after review feedback (route discovery/runtime safety).

### Validation status
- `npm run typecheck` passed after capability-gating/doc updates.
- `npm test -- --run` passed (`14` tests).

### Remaining risks / TODO
- Admin `supabase` provider is still a stub (capability-off); real Supabase admin endpoints/flows remain out of scope until explicitly designed.
- Settings sync for `supabase` remains intentionally unsupported; keep feature capability-gated unless a concrete adapter contract is approved.
- Profile token rotation propagation is now implemented in the profile provider/service path, but it still needs real Supabase smoke validation to confirm observed token-rotation behavior on device/web.

## Session Update (2026-02-23, PMN-070 token propagation)

### Scope of work
- Continued the next canonical roadmap step for `PMN-070` profile hardening.
- Closed the Supabase profile-update token-rotation propagation gap and aligned tests/docs.

### Changes completed
- Extended profile update contract to return `{ user, rotatedSession? }` instead of only `AuthUser`:
  - `src/services/profile.provider.types.ts`
  - `src/services/profile.service.ts`
- `src/services/profile.provider.ts`
  - `supabase` update path now captures rotated session tokens from `supabase.auth.setSession(...)`
  - returns `rotatedSession` when available
  - `generic-rest` update path now returns `{ user }` under the new contract
- `src/hooks/useProfile.ts`
  - persists refreshed profile user snapshot to `SESSION_USER_KEY` on refresh/save
  - persists rotated access/refresh tokens (when returned) to secure storage on profile save
  - updates auth store session token when a rotated token is returned
- Test updates:
  - `tests/services/profile.provider.test.ts` covers rotated-session token propagation from Supabase update
  - `tests/services/profile.service.test.ts` updated for new update result shape
  - `tests/services/settingsSync.provider.test.ts` expectation aligned with intentional unsupported-detail text

### Validation status
- `npm run typecheck` passed
- `npm test -- --run` passed (`15` tests)

### Remaining risks / TODO
- No hook-level automated tests yet for `useProfile()` persistence side effects (storage writes + auth store token update).
- Live Supabase validation is still required to confirm whether `setSession()` returns rotated tokens consistently across web/native runtimes.

## Session Snapshot (2026-02-22)

- `docs/NEXT_CHAT_HANDOFF.md` remains the canonical handoff doc in this repo (root `NEXT_CHAT_HANDOFF.md` now points here).
- Expo/EAS setup progressed manually in local dev environment:
  - user ran `npx eas-cli@latest init --id 3d77d346-0399-4039-a29a-5d51abc8db1e`
  - user logged into Expo manually during EAS setup
  - local Expo config was synced for EAS linkage (`app.json`: `owner`, `extra.eas.projectId`, slug currently `pmnative-test`)
  - Expo CLI generated local support changes (`expo-env.d.ts` ignore entry, `.expo/types/**/*.ts` tsconfig include, explicit `expo-asset` dependency/plugin)
- PMN-021 moved from scaffold-only social auth to a working Supabase Google OAuth redirect/callback implementation.
- Follow-up review pass analyzed the newly added social auth code and fixed callback flow edge cases (see "Latest Review Pass").
- Phase 2 component gaps (`PMN-060` skeleton/loading states + `BottomSheet`) were implemented and reviewed for runtime issues.

## DX / Runtime Review Pass (2026-02-23)

### Scope of analysis
- Reviewed newly added DX/bootstrap/runtime changes introduced during local Expo setup stabilization:
  - `scripts/expo-start.mjs`
  - `scripts/doctor-local.mjs`
  - `scripts/setup-local.mjs`
  - `src/services/storage.service.ts` (web / Expo Go fallback behavior)
  - Admin diagnostics UI extraction reuse (`BackendDiagnosticsCard`)
- Re-ran validation after fixes:
  - `npm run typecheck`
  - `node --check` on new scripts
  - `npm run doctor:local`

### Issues discovered
1. `storageService.getSecureItem()` fallback path on web did not actually catch async `SecureStore.getItemAsync()` rejections (`return` without `await` inside `try`).
2. Web storage fallback could lose data when `localStorage` was unavailable because a new in-memory fallback store was created on each call (`set` / `get` / `remove` not sharing state).
3. `createWebStorage()` could throw during `globalThis.localStorage` access in restricted browser contexts, causing the fallback path to fail early.
4. New DX scripts spawned `npm` directly (`npm`, not `npm.cmd` on Windows), which would break `doctor/setup/tunnel` preflight on Windows shells.

### Fixes implemented
- Fixed `storageService.getSecureItem()` to `await` `SecureStore.getItemAsync()` so web fallback catches async failures correctly.
- Added a shared singleton web storage instance and shared in-memory fallback store so web fallback values persist across calls within the app session.
- Wrapped web `localStorage` initialization in a safe `try/catch`, with fallback to in-memory storage when access is blocked.
- Updated `scripts/expo-start.mjs`, `scripts/doctor-local.mjs`, and `scripts/setup-local.mjs` to use platform-aware `npm` command resolution (`npm.cmd` on Windows).
- Re-verified DX checks and type safety after fixes.

### Remaining risks / TODO
- CLI diagnostics are now the intended dev path (`doctor:local`, `doctor:expo`, `setup`), but app-side Admin diagnostics UI still exists for framework scaffolding and is not a product feature.
- `react-native-mmkv` fallback now prevents web / Expo Go startup crashes, but Expo Go still uses in-memory storage (expected); persistence semantics differ from MMKV until a product-approved fallback strategy is finalized.
- `doctor:local` currently validates local machine/runtime setup but does not yet test network reachability to Metro from phone devices (Wi-Fi isolation / firewall checks remain manual).

## Next Phase Started (2026-02-23)

Active next-step prioritization is maintained in `docs/pmnative/ROADMAP.md` (to avoid split roadmap sources).

### PMN-070 (Supabase profile provider path)
- Began Phase 3 follow-up work on the default backend (`supabase`) profile provider.
- `src/services/profile.provider.ts` now implements a real Supabase remote profile fetch path using `supabase.auth.getUser(token)` when `backend.provider = 'supabase'`.
- Supabase profile remote update path is now implemented for display-name updates using `supabase.auth.setSession(...)` + `supabase.auth.updateUser({ data: { name } })`.
- `useProfile()` now loads the stored refresh token from secure storage for save operations and passes it through `profileService` -> `profileProvider`.

## Test Harness Start (2026-02-23)

### Scope of work
- Started the framework-phase non-UI test harness and first unit-style service/provider tests.
- Added `vitest` and initial test scripts:
  - `npm test`
  - `npm run test:watch`
- Added initial tests for:
  - `settingsSyncService`
  - `settingsSyncProvider`
  - `profileService`

### What is covered right now
- `settingsSyncService`
  - warning vs ok preview states
  - request draft payload shape (`pmnative.settings.sync/1`)
- `settingsSyncProvider`
  - `supabase` `NOT_SUPPORTED`
  - `generic-rest` missing-endpoint `CONFIG`
  - `generic-rest` success mapping (`{ syncedAt }` -> `{ kind: 'synced' }`)
  - provider error mapping/preservation (`SettingsSyncProviderError` passthrough, unknown error -> `PROVIDER`)
- `profileService`
  - fallback behavior for mapped provider errors (`CONFIG`, `NOT_SUPPORTED`, `UNAUTHORIZED`)
  - rethrow behavior for `PROVIDER`
  - refresh-token passthrough on `updateProfile()`

### Remaining risks / TODO
- No tests yet for `profileProvider` normalization/error mapping (generic-rest + supabase)
- No tests yet for auth provider hydration/refresh/social callback edge cases
- No UI/e2e harness (intentional; current phase focus is service/provider contract coverage)

## Service / Provider Test Review Pass (2026-02-23)

### Scope of analysis
- Reviewed newly added non-UI test harness and provider/service follow-up changes:
  - `vitest` setup (`package.json`, `vitest.config.ts`)
  - `tests/services/*`
  - `src/services/profile.provider.ts` Supabase profile update path
  - `src/hooks/useProfile.ts` refresh-token passthrough for profile save
- Re-ran validation:
  - `npm test`
  - `npm run typecheck`

### Issues discovered
1. Supabase profile provider error mapping treated only HTTP `401` as unauthorized; `403` would be incorrectly surfaced as generic provider failure.
2. Supabase profile update path may rotate/refresh tokens during `auth.setSession(...)`, but the current profile provider contract returns only `AuthUser`, so refreshed tokens are not propagated back to auth storage/state.

### Fixes implemented
- Added shared Supabase profile error-code mapper in `src/services/profile.provider.ts` and now map both `401` and `403` to `UNAUTHORIZED` across:
  - `getProfile()`
  - `updateProfile()` `setSession` path
  - `updateProfile()` `updateUser` path
- Verified all added tests and typecheck pass after the fix.

### Remaining risks / TODO
- Token rotation side effect during Supabase `setSession()` in profile update remains a contract gap:
  - profile provider returns only `AuthUser`
  - refreshed access/refresh tokens (if rotated) are not persisted back to auth state/storage
  - consider a follow-up contract extension or explicit non-goal decision
- `profileProvider` tests are still missing (next step), especially:
  - generic-rest payload normalization variants
  - Supabase error mapping (`401`/`403` -> `UNAUTHORIZED`)

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
- `generic-rest` settings sync execution is now implemented when `backend.genericRest.settings.endpoints.sync` is configured; `supabase` remains intentionally stubbed.
- `PMN-070` profile fetch now has a provider-facing execution path: `generic-rest` remote fetch is implemented when `backend.genericRest.profile.endpoints.get` is configured; otherwise the service falls back to the auth session snapshot.
- `PMN-070` profile update now has a provider-facing execution path: `generic-rest` remote update is implemented when `backend.genericRest.profile.endpoints.update` is configured.
- `PMN-074` admin users list now has a provider-facing execution path: `generic-rest` remote list is implemented when `backend.genericRest.admin.endpoints.listUsers` is configured; otherwise the service falls back to a local session-user placeholder list.
- Admin Users UI now explicitly shows whether data came from the remote provider endpoint or the session fallback directory (including source detail text).
- `PMN-074` admin user detail now has a provider-facing execution path and route (`/(admin)/users/[id]`), with `generic-rest` remote fetch implemented when `backend.genericRest.admin.endpoints.getUser` is configured.

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
- Framework-first testing policy: use mocks/contracts/placeholders first; defer live backend/provider credentials and OAuth smoke tests to final integration validation.

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
- `docs/pmnative/ROADMAP.md` now includes a current-state snapshot and practical "what is left" priorities (not just links/index text).
- Local Expo/EAS project linkage has been initialized manually by the user (`eas init` with project ID `3d77d346-0399-4039-a29a-5d51abc8db1e`); preserve this linkage in subsequent build/deploy setup work.
- Local Expo config/package sync changes were introduced during EAS/DX setup work and should be preserved:
  - `app.json` owner/project linkage + slug change (`pmnative-test`)
  - `expo-asset` added as explicit dependency/plugin (lockfile updated; package dedupe moved nested `expo-asset`)
  - `.gitignore` / `tsconfig.json` updated for Expo generated typings (`expo-env.d.ts`, `.expo/types/**/*.ts`)
- DX bootstrap tooling was added for dev-PC-first diagnostics and startup guidance:
  - `npm run doctor:local`
  - `npm run doctor:expo`
  - `npm run setup`
  - `npm run phone` / `npm run tunnel` wrappers (Expo startup preflight)
- App-side non-admin diagnostics route experiment was reverted (user-facing diagnostics access removed); diagnostics remain a dev-PC concern and Admin scaffolding tool only.
- `LICENSE` added (GNU GPL v3; `GPL-3.0-only`), and `package.json` now includes SPDX license metadata.
- `docs/SUPABASE_SETUP.md` extended with PMN-021 social auth prep guidance (`Google` first, capability gating for `Telegram` / `VK`).
- `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md` extended with a proposed PMN-021 social auth contract (`socialCapabilities`, `socialStart`, `socialComplete`).
- `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md` now also documents the PMN-071 `generic-rest` settings sync contract extension (`backend.genericRest.settings.endpoints.sync`, `pmnative.settings.sync/1`, required `{ syncedAt }` response).
- `generic-rest` user payload parsing is now shared between auth and profile providers via `src/services/genericRest.schemas.ts`.
- Profile tab now includes a basic editable display-name field and save action wired through `useProfile()` -> `profileService` -> `profileProvider`.
- `PMN-074` `generic-rest` admin users list contract path is implemented and config-validated (`backend.genericRest.admin.endpoints.listUsers`).
- `PMN-074` `generic-rest` admin user detail contract path is implemented and config-validated (`backend.genericRest.admin.endpoints.getUser`, `:id` placeholder).
- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md` updated to include social auth in MVP/auth milestone and `PMN-021`.
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md` added (scope, acceptance criteria, implementation order, risks).

## Verified

- `npm run typecheck` passes in this repo after latest changes (including PMN-021 scaffold).
- `npm run typecheck` passes after DX/runtime review fixes (`storageService` web/Expo Go fallback + script cross-platform `npm` spawning).
- `node --check` passes for new DX scripts (`scripts/expo-start.mjs`, `scripts/doctor-local.mjs`, `scripts/setup-local.mjs`).
- `npm run doctor:local` runs successfully after DX/runtime review fixes.
- `npm test` passes with the new `vitest` harness (initial service/provider tests).
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
    - `generic-rest` settings sync provider path can now execute a real `POST` request when `backend.genericRest.settings.endpoints.sync` is configured (response schema requires `syncedAt`)
  - default-provider (`supabase`) profile provider follow-up started:
    - remote profile fetch implemented via `supabase.auth.getUser(token)`
    - remote display-name update implemented via `setSession` + `auth.updateUser(...)`
    - `useProfile()` save path now passes refresh token from secure storage to the provider
  - non-UI test harness started (`vitest`):
    - initial tests added for `settingsSyncService`, `settingsSyncProvider`, `profileService`

## Known Remaining Risks / TODO

### Immediate validation (framework phase, no real secrets required)
1. Run local static/framework checks first:
   - `npm run typecheck`
   - provider contract/config validation checks
   - screen-flow/manual QA with fallback/mock paths
   - re-check Expo config after EAS sync changes (`app.json` slug/owner/projectId, plugin list, generated typings include)

### Final integration validation (deferred; real values required)
1. Run Supabase smoke test in Expo against a real project:
   - sign up (with and without email confirmation)
   - sign in
   - session hydrate
   - refresh
   - forgot password
   - sign out

### Next implementation priorities
1. Tests
   - expand provider tests (`supabase`, `generic-rest`) beyond initial `settingsSyncProvider` / `profileService` coverage
   - add `profileProvider` tests (generic-rest payload normalization + supabase error mapping)
   - auth hydration/refresh edge cases
2. Out-of-the-box social auth support
   - `Google` in `supabase` provider runtime support is now implemented (capability-gated)
   - next (final integration phase): real Supabase smoke test for callback/deep-link flow (native + web)
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
   - next (final integration phase): real Supabase Google smoke test (web + native deep link) and document any platform-specific callback URL quirks (including auth-session vs fallback behavior)
4. Phase 2 integration pass
   - `SkeletonList` and `LoadingOverlay` now have real in-app usages; next expand `SkeletonText`/`SkeletonCard` usage into additional screens
   - `BottomSheet` now has admin + user-facing usages; next test nested scroll/gesture interactions once a scrollable sheet use case exists
5. Phase 3 kickoff
  - `PMN-070` User Profile module kickoff is started (`useProfile()` + profile screen refinement)
  - service contract boundary is defined (`profileService`)
  - provider-facing profile contract is now scaffolded (`profileProvider`)
  - `generic-rest` remote profile fetch path is implemented and config-gated via `backend.genericRest.profile.endpoints.get`
  - `generic-rest` remote profile update path is implemented and config-gated via `backend.genericRest.profile.endpoints.update`
  - `supabase` remote profile fetch path is implemented via `supabase.auth.getUser(token)`
  - `supabase` remote display-name update path is implemented via `setSession` + `auth.updateUser(...)`
  - next: add `profileProvider` tests (generic-rest normalization + supabase error mapping), then expand beyond display-name-only editing
  - `PMN-071` Settings module kickoff is started (`useSettings()` + persisted local preferences)
  - settings local-state architecture is now store-backed (`useSettingsStore`) and sync contract preview logic is split into `settingsSyncService`
  - provider-facing execution contract is now scaffolded (`settingsSyncProvider`)
  - `generic-rest` execution path is implemented and config-gated via `backend.genericRest.settings.endpoints.sync`
  - generic-rest settings-sync endpoint contract is now documented in `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`
  - `settingsSyncProvider` tests are now added (`NOT_SUPPORTED`, `CONFIG`, success mapping, provider error mapping)
  - next: implement a `supabase` adapter or explicit non-goal and add provider tests for that decision
  - `PMN-074` Admin module kickoff is started (`useAdmin()` + existing admin screen integration)
  - service contract boundary is defined (`adminService`) and hidden global-state reads were removed
  - provider-facing admin contract is now scaffolded (`adminProvider`)
  - `generic-rest` remote admin users list path is implemented and config-gated via `backend.genericRest.admin.endpoints.listUsers`
  - `generic-rest` remote admin user detail path is implemented and config-gated via `backend.genericRest.admin.endpoints.getUser` (`:id` template)
  - Admin Users rows now navigate to `/(admin)/users/[id]` detail screens
  - `useAdmin()` / Admin Users screen now surfaces users source metadata (`remote` vs `session-fallback`) for clearer diagnostics
  - next: document/test generic-rest admin user-detail contract and add roles/settings endpoints/contracts
6. DX / dev tooling follow-up (dev-PC path; non-product)
  - optionally add LAN connectivity diagnostics helper (host IP + firewall/Wi-Fi isolation guidance) to `doctor:local`
  - optionally add `adb devices` summary when `adb` is available (device authorization state)
  - keep user-facing app UX free of diagnostics shortcuts unless explicitly product-approved

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
- Next implementation target should remain framework-first:
  - mocked/contract-based validation for auth/social/provider flows
  - provider diagnostics for social auth callback config visibility
  - document platform-specific auth-session/fallback behavior and any redirect URL allow-list quirks
- Final integration validation target (deferred):
  - Supabase Google smoke test (web + native deep link)
