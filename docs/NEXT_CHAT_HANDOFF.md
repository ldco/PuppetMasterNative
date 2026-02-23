# PMNative Next Chat Handoff

Last updated: 2026-02-23
Status: PMNative is now in its own repo (`ldco/PuppetMasterNative`)

Planning note:
- Canonical current roadmap + immediate next-step list now lives in `docs/pmnative/ROADMAP.md`.
- This handoff file is for session history, implementation notes, and review findings.

## Session Update (2026-02-23, next phase start: auth provider password tests)

### Current status
- Started the next planned phase immediately after pushing `PMN-070` direct password update work: expanding mocked auth-provider tests.
- Added provider-level password-update tests for `generic-rest` (`NOT_SUPPORTED` + configured endpoint success path) and `supabaseAuthProvider.updatePassword()` (success + unauthorized mapping).
- Vitest `react-native` parser blocker for direct `supabaseAuthProvider` unit imports is resolved via a test shim alias in `vitest.config.ts`.
- Portable password update support has started:
  - `AuthProviderCapabilities.canUpdatePassword` added
  - `Change Password` screen now uses capability-gating instead of provider-name checks
  - `generic-rest` auth endpoint contract now supports optional `changePassword`
- `generic-rest updatePassword()` is now hardened to normalize optional rotated-token responses and map API/config errors to `AuthProviderError` codes for UI-safe handling.

### Completed work
- Added `tests/services/auth.providers.password.test.ts`:
  - `generic-rest` `updatePassword()` returns `NOT_SUPPORTED` when endpoint is absent
  - `generic-rest` `updatePassword()` success path posts to configured `changePassword` endpoint
  - `generic-rest` `updatePassword()` supports optional rotated-token response payloads
  - `generic-rest` `updatePassword()` maps unauthorized/server/config errors to provider error codes
  - `supabase` `updatePassword()` success path returns rotated session
  - `supabase` `updatePassword()` maps `setSession` `403` to `UNAUTHORIZED`
- Added portable password-update capability plumbing and UI gating:
  - `AuthProviderCapabilities.canUpdatePassword`
  - `generic-rest` optional `auth.endpoints.changePassword`
  - `Change Password` screen direct update availability now follows provider capabilities
- Added a Vitest `react-native` shim alias (`tests/shims/react-native.ts`) so Node-runtime tests can import provider modules that reference `react-native`.
- Validation after adding the new test file:
- Validation after provider contract hardening:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`29` tests)

### Open tasks
- Continue `PMN-070` avatar upload flow (replace manual `avatarUrl`) and decide whether to expand generic-rest password-update contract beyond the current optional rotated-token payload normalization (e.g. explicit response schema docs if backend teams adopt rotation).

### Recommended next step
- Start the `PMN-070` avatar upload contract/UI path (provider/service/hook scaffolding + tests), then return for live Supabase validation of password-update token rotation behavior.

### Remaining risks / TODO
- `generic-rest updatePassword()` now normalizes optional rotated-token payloads but the response contract is not yet documented as a formal backend spec; add docs/examples if this becomes a committed cross-backend behavior.
- Supabase password-update and profile-save token rotation behavior still needs live runtime smoke verification (deferred final integration phase).

## Session Update (2026-02-23, PMN-070 avatar upload implementation pass)

### Current status
- `PMN-070` avatar upload is now provider-backed and capability-gated instead of manual-URL-only.
- Profile screen supports selecting an image from the media library and uploading it via the active profile provider, then fills `avatarUrl` draft for normal profile save persistence.
- Upload path propagates rotated Supabase session tokens (when `setSession(...)` rotates during upload auth bootstrap) back to secure storage/auth store.

### Completed work
- Added `expo-image-picker` dependency and profile UI upload action (`Upload avatar`) in `src/app/(tabs)/profile.tsx`.
- Extended profile provider/service contracts with avatar-upload methods and capability flag:
  - `ProfileProviderCapabilities.canUploadAvatar`
  - `profileProvider.uploadAvatar(...)`
  - `profileService.uploadAvatar(...)`
- Implemented provider uploads:
  - `generic-rest`: multipart `POST` to optional `backend.genericRest.profile.endpoints.uploadAvatar`, response normalization (`avatarUrl` / `url` payload variants), timeout/error mapping
  - `supabase`: capability-gated on optional `backend.supabase.profileAvatarsBucket`, authenticated storage upload + public URL resolution, rotated-session propagation from `setSession(...)`
- Updated `useProfile()` with avatar upload state/error handling and rotated-token persistence.
- Expanded tests:
  - `tests/services/profile.provider.test.ts` (generic-rest + supabase upload paths)
  - `tests/services/profile.service.test.ts` (avatar upload pass-through)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`33` tests)

### Open tasks
- Run live Supabase smoke validation for avatar upload + token rotation behavior (actual bucket/policies/device runtime).
- Decide whether to auto-save profile metadata after successful avatar upload, or keep current explicit "Upload then Save profile" UX.
- Add contract docs/examples for `generic-rest profile.endpoints.uploadAvatar` payload/response if this becomes shared backend spec.

### Recommended next step
- Execute a live Supabase `PMN-070` smoke pass (profile save + password change + avatar upload with a configured public bucket), then move to `PMN-071` / `PMN-074` contract expansion.

### Remaining risks / TODO
- Supabase avatar upload depends on a configured public bucket (`backend.supabase.profileAvatarsBucket`) and permissive storage policies; without that, UI remains capability-disabled.
- `generic-rest` avatar upload uses multipart `fetch` outside `apiRequest`, so retry/auth-refresh behavior is not shared yet (intentional for now to avoid broad transport changes).

## Session Update (2026-02-23, PMN-071 Supabase settings sync adapter pass)

### Current status
- `PMN-071` settings sync is no longer Supabase-unsupported: a Supabase adapter now executes sync by updating `user_metadata` (`pmnative_settings_sync` + `pmnative_settings_synced_at`).
- `useSettingsSync()` now passes auth tokens to the provider and persists rotated tokens returned from Supabase `setSession(...)`.
- Admin settings UI copy/badges now reflect provider-backed sync readiness instead of “stub” messaging.

### Completed work
- Implemented `supabase` settings sync provider in `src/services/settingsSync.provider.ts`:
  - `setSession(access, refresh)` bootstrap
  - `auth.updateUser({ data: { pmnative_settings_sync, pmnative_settings_synced_at } })`
  - `UNAUTHORIZED` error mapping for missing tokens / 401 / 403
  - optional rotated-session result propagation
- Extended settings sync provider contracts:
  - `ExecuteSettingsSyncInput` now accepts `accessToken` + `refreshToken`
  - `ExecuteSettingsSyncResult` now supports optional `rotatedSession`
  - added `UNAUTHORIZED` provider error code
- Updated `useSettingsSync()` to:
  - read refresh token from secure storage
  - pass auth context into provider
  - persist rotated access/refresh tokens and update auth store session
- Updated `tests/services/settingsSync.provider.test.ts`:
  - Supabase success path (rotated session + metadata payload)
  - Supabase missing-token unauthorized path
  - existing generic-rest tests preserved
- Updated `src/app/(admin)/settings.tsx` copy:
  - provider-backed sync messaging and `ready` badge when capability is executable
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`34` tests)

### Open tasks
- Live-validate Supabase settings sync against a real project (metadata write permissions/behavior and token rotation in runtime).
- Document the Supabase `user_metadata` payload shape (`pmnative_settings_sync`) as an intentional contract (or mark explicitly internal/temporary).
- Continue `PMN-074` admin provider contract expansion (next endpoints beyond users list/detail).

### Recommended next step
- Run a combined live Supabase smoke pass for `PMN-070` + `PMN-071` (profile save, password change, avatar upload, settings sync), then move to `PMN-074` roles/settings endpoints.

### Remaining risks / TODO
- Supabase settings sync currently writes to `user_metadata`; if product requirements later need shared org/global settings, a server-backed table/API will still be required.
- Rotated-token persistence is wired in `useSettingsSync()`, but live Supabase behavior should still be confirmed on-device/web.

## Session Update (2026-02-23, PMN-074 admin roles endpoint slice)

### Current status
- `PMN-074` now includes a provider-backed admin roles list slice in addition to users list/detail.
- `generic-rest` admin roles endpoint support (`backend.genericRest.admin.endpoints.listRoles`) is implemented and config-gated.
- Admin UI now has a real `Roles` screen/route (`/(admin)/roles`) that reuses shared admin state and follows the users screen pattern.

### Completed work
- Extended admin provider contracts/capabilities:
  - `canListRolesRemote`
  - `listRolesDetail`
  - `listRoles(...)`
  - `AdminProviderRoleSummary`
- Implemented `generic-rest` admin roles provider path in `src/services/admin.provider.ts`:
  - payload normalization for array / `{ roles }` / `{ success: true, data.roles }`
  - normalized `description` + default `assignable: true`
- Added admin service roles path in `src/services/admin.service.ts`:
  - `listRoles()` / `refreshRoles()`
  - fallback role summaries (`master/admin/editor/user`) when unsupported/config/auth-gated
- Expanded `useAdmin()` to load/refresh roles alongside users and expose roles source/error/loading state.
- Added admin roles screen and routing:
  - `src/app/(admin)/roles.tsx`
  - `src/app/(admin)/index.tsx` now routes `roles` section to `./roles`
- Added tests:
  - `tests/services/admin.provider.test.ts`
  - `tests/services/admin.service.test.ts`
- Fixed a concurrency bug introduced during the hook expansion:
  - users and roles now use separate request ids in `useAdmin()` (refreshing one no longer invalidates the other)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`40` tests)

### Open tasks
- Continue `PMN-074` with next admin endpoints/actions (role assignment/update and/or admin settings endpoints) using provider tests/contracts first.
- Decide whether admin roles should remain hidden when provider roles endpoint is unavailable, or show a capability-gated fallback screen for discoverability.
- Add admin hook/screen tests if admin UI state complexity grows.

### Recommended next step
- Implement the next `PMN-074` contract slice: generic-rest admin settings endpoint(s) or role-assignment mutation endpoint(s), then wire capability-gated UI actions.

### Remaining risks / TODO
- `supabase` admin provider remains a stub (no users/roles remote APIs), which is acceptable for current scaffolding but limits parity with `generic-rest`.
- Admin roles currently support read-only listing; no mutation/assignment flows exist yet.

## Session Update (2026-02-23, PMN-074 admin role assignment/update slice)

### Current status
- `PMN-074` admin user role assignment/update is now started for `generic-rest` via a provider-backed mutation endpoint.
- Admin User Detail screen (`/(admin)/users/[id]`) now exposes capability-gated role action buttons that invoke the new mutation path.
- Mutation updates the local detail view state immediately on success and preserves existing remote/fallback source metadata.

### Completed work
- Extended admin endpoint/config contracts:
  - `backend.genericRest.admin.endpoints.updateUserRole` (expected `:id` placeholder)
- Extended admin provider contracts/capabilities:
  - `canUpdateUserRoleRemote`
  - `updateUserRoleDetail`
  - `updateUserRole(...)`
- Implemented `generic-rest` role update provider path in `src/services/admin.provider.ts`:
  - `PATCH` to templated endpoint
  - body `{ role }`
  - user payload normalization reuse
- Added admin service mutation wrapper in `src/services/admin.service.ts`:
  - capability gating (`NOT_SUPPORTED`)
  - normalized `Unknown user` name fallback
- Extended `useAdminUser()` with role mutation state:
  - `isUpdatingRole`
  - `roleUpdateError`
  - `updateRole(...)`
- Updated `src/app/(admin)/users/[id].tsx`:
  - role action buttons (`Set master/admin/editor/user`)
  - capability/error messaging for unsupported/update failures
  - loading overlay reflects role-update in-flight state
- Added/expanded tests:
  - `tests/services/admin.provider.test.ts` (role update success + config placeholder validation)
  - `tests/services/admin.service.test.ts` (role update success + unsupported capability handling)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`44` tests)

### Open tasks
- Add role-action safety/policy UX (e.g., disable `master` assignment for non-master admins in UI) and backend-specific error messaging.
- Continue `PMN-074` with next provider-backed admin endpoints (settings/health/logs or user status/lock flows).
- Add admin UI hook/screen tests if mutation flows expand further.

### Recommended next step
- Implement the next admin mutation/endpoint contract (`user status/disable` or admin settings endpoint) using the same provider/service-first pattern, then wire capability-gated UI controls.

### Remaining risks / TODO
- `supabase` admin provider remains a stub; admin mutations currently only progress on `generic-rest`.
- Role update path relies on backend enforcement for authorization/rule checks (UI currently exposes all role buttons when capability is enabled).

## Session Update (2026-02-23, review pass: PMN-070/071/074 recent roadmap additions)

### Current status
- Reviewed the current uncommitted roadmap batch spanning:
  - `PMN-070` avatar upload + password/profile token-rotation hardening
  - `PMN-071` Supabase settings sync adapter
  - `PMN-074` admin roles list + role assignment/update paths
- Validation remains green after review fixes (`npm run typecheck`, `npm test -- --run` -> `45` tests).
- One provider error-mapping bug and one admin-role UI safety issue were fixed.

### Scope of analysis
- Admin role endpoints/mutations and UI:
  - `src/services/admin.provider.ts`
  - `src/services/admin.service.ts`
  - `src/hooks/useAdmin.ts`
  - `src/hooks/useAdminUser.ts`
  - `src/app/(admin)/roles.tsx`
  - `src/app/(admin)/users/[id].tsx`
  - `tests/services/admin.provider.test.ts`
  - `tests/services/admin.service.test.ts`
- Spot-checked adjacent recent roadmap slices (`PMN-070` / `PMN-071`) for regressions via full test/typecheck pass.

### Issues discovered
- `src/services/admin.provider.ts`
  - `generic-rest` admin API methods (`listUsers`, `getUser`, `listRoles`, `updateUserRole`) wrapped all transport failures as `PROVIDER`, losing `401/403` unauthorized semantics from API responses.
  - This breaks admin service fallback behavior for read endpoints and weakens UI handling for expired sessions.
- `src/app/(admin)/users/[id].tsx`
  - New role assignment UI exposed unsafe local actions by default:
    - self role-change was allowed (easy self-demotion/lockout foot-gun)
    - non-`master` admins could locally attempt `master` assignment despite likely backend policy restrictions

### Fixes implemented
- Added centralized admin provider request error mapping in `src/services/admin.provider.ts`:
  - preserves `UNAUTHORIZED` for API `401/403`
  - keeps other transport/backend failures as `PROVIDER`
  - applied across all `generic-rest` admin endpoints (users list/detail, roles list, role update)
- Added test coverage for unauthorized mapping:
  - `tests/services/admin.provider.test.ts` now covers `listRoles()` mapping `ApiError 401 -> AdminProviderError(UNAUTHORIZED)`
- Hardened admin role assignment UI in `src/app/(admin)/users/[id].tsx`:
  - disables role actions for the current signed-in actor (prevents self-role-change foot-gun)
  - disables `Set master` unless current actor role is `master`
  - backend remains the source of truth for authorization

### Completed work (this review pass)
- Reviewed and validated the current roadmap implementation batch.
- Fixed admin provider unauthorized error mapping regression.
- Added admin user-detail role action safety guards.
- Re-ran validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`45` tests)

### Open tasks
- Commit and push the current roadmap batch (PMN-070/071/074 additions + review fixes).
- Continue `PMN-074` with next provider-backed admin endpoints/mutations (user status/disable, admin settings endpoints, health/logs).
- Run live Supabase smoke validation for `PMN-070`/`PMN-071` after current mocked-contract phase.

### Recommended next step
- After commit/push, continue `PMN-074` with a user status/disable mutation endpoint (provider/service-first + capability-gated UI), then proceed to live Supabase smoke validation for profile/settings flows.

### Remaining risks / TODO
- `supabase` admin provider is still a stub (generic-rest-only progress on admin module).
- Admin role update UX now has basic guardrails, but backend-enforced policy errors should still be surfaced more specifically than the current generic role-update error string if the flow expands.

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
