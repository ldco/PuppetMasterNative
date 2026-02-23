# PMNative Roadmap (Canonical Current State + Next Steps)

This file is the canonical source for current roadmap status and immediate next implementation steps.

Long-form phase planning lives in:

- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`

Related planning docs:

- `docs/pmnative/PMNative_Architecture_Proposal_—_React_Native_Framework_Design.md`
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md`
- `docs/pmnative/PMN-021_AUTH_TEST_MATRIX.md`
- `docs/NEXT_CHAT_HANDOFF.md` (session history / implementation notes, not the canonical next-step list)

## Current State (2026-02-23)

PMNative is in a Phase 2 -> Phase 3 transition.

What is already done (high level):

- Provider-based auth architecture is implemented (`supabase`, `generic-rest`)
- Core auth flows are implemented (login/register/forgot/logout/hydration/refresh)
- PMN-021 social auth runtime foundation is implemented for Supabase Google (capability-gated)
- Phase 2 component gaps are implemented:
  - `PMN-060` skeleton/loading states
  - `BottomSheet` (remaining `PMN-054` organism)
- Phase 3 kickoffs started:
  - `PMN-070` Profile
  - `PMN-071` Settings
  - `PMN-074` Admin
- `PMN-070` profile provider-backed fetch path has started:
  - `generic-rest` profile endpoint support (`backend.genericRest.profile.endpoints.get`) is implemented and config-gated
  - `supabase` profile remote fetch path is implemented via `supabase.auth.getUser(token)`
- `PMN-070` profile update path has started:
  - `generic-rest` profile update endpoint support (`backend.genericRest.profile.endpoints.update`) is implemented and config-gated
  - `supabase` profile remote update path is implemented via `setSession` + `auth.updateUser({ data: { name } })`
  - rotated tokens from Supabase `setSession(...)` are now propagated through the profile provider/service and persisted back to auth storage/store during profile save
- `PMN-074` admin users provider-backed list path has started:
  - `generic-rest` admin users endpoint support (`backend.genericRest.admin.endpoints.listUsers`) is implemented and config-gated
  - admin user-detail route/provider path is implemented (`backend.genericRest.admin.endpoints.getUser`, config-gated)
- `PMN-074` admin roles provider-backed list path has started:
  - `generic-rest` admin roles endpoint support (`backend.genericRest.admin.endpoints.listRoles`) is implemented and config-gated
  - admin roles route/provider/service path is implemented with config fallback role summaries
  - admin user role assignment/update path has started (`backend.genericRest.admin.endpoints.updateUserRole`, config-gated) with provider/service support and capability-gated actions in admin user detail
  - admin user status enable/disable path has started (`backend.genericRest.admin.endpoints.updateUserStatus`, config-gated) with provider/service support and capability-gated actions in admin user detail
  - admin health endpoint slice has started (`backend.genericRest.admin.endpoints.health`, config-gated) with provider/service/hook/screen support and local fallback snapshot behavior
  - admin logs endpoint slice has started (`backend.genericRest.admin.endpoints.listLogs`, config-gated) with provider/service/hook/screen support and local fallback list behavior
  - admin clear-logs mutation slice has started (`backend.genericRest.admin.endpoints.clearLogs`, config-gated) with provider/service/hook/screen support and capability-gated action in admin logs
  - admin settings endpoint slice has started (`backend.genericRest.admin.endpoints.settings`, config-gated) with provider/service/hook support and integration into the existing admin settings screen (remote snapshot + config fallback)
  - admin user lock/unlock mutation slice has started (`backend.genericRest.admin.endpoints.updateUserLock`, config-gated) with provider/service support and capability-gated actions in admin user detail
  - admin users list now includes inline status/lock controls (ops UX polish) backed by existing provider/service mutations with per-row mutation state/error handling in `useAdmin()`
- Module architecture cleanup pass completed:
  - shared settings store (`useSettingsStore`)
  - explicit service inputs (no hidden global store reads in services)
  - safer async loading/refresh/error hook contracts
  - admin hook architecture cleanup: monolithic `useAdmin()` orchestration has been split into focused hooks (`useAdminSections`, `useAdminUsers`, `useAdminRoles`) to reduce coupling between screens and make per-screen state ownership clearer
- Settings sync contract scaffolding started:
  - typed preview + draft payload (`pmnative.settings.sync/1`)
  - provider-facing `settingsSyncProvider` contract (`generic-rest` execution path implemented, config-gated)
  - `supabase` settings sync execution path is now implemented via `setSession` + `auth.updateUser({ data: { pmnative_settings_sync } })` with rotated-token propagation
- Test harness has started (non-UI, service/provider level):
  - `vitest` setup added (`npm test`, `npm run test:watch`)
  - initial tests added for `settingsSyncService`, `settingsSyncProvider`, and `profileService`

What is not finished:

- Full provider-backed admin module APIs are not implemented yet (users list/detail, roles list, logs list + clear logs, admin settings snapshot, role update, user status update, user lock/unlock, and health snapshot are started; deeper workflows/per-log audit mutations remain pending, though list-level ops UX is now improved)
- Profile module now supports display name + avatar URL plus provider-backed avatar upload (capability-gated: `generic-rest` multipart endpoint or Supabase Storage bucket config), and a profile-linked change-password screen with direct password update capability-gating (Supabase-first implementation; generic-rest endpoint support + mocked provider tests with optional rotated-token handling); live validation remains pending
- Settings sync live validation/policy verification for Supabase user metadata updates (adapter is implemented)
- Full auth test matrix execution (especially interactive Supabase/social smoke tests)
- Telegram/VK runtime social auth adapters (currently capability-gated/doc-planned)

Testing policy for this framework phase:

- Build and validate with mocks/contracts first (no real secrets required)
- Defer live integration smoke tests (real env values, real provider config, real OAuth redirects) to the final validation phase

## What Comes After Auth (Current Practical Sequence)

Auth is not "done-done" yet; it is in validation + extension mode:

1. Continue framework-first auth validation (no real secrets)
- Core auth regression via unit/integration-style tests and contract checks
- Telegram/VK capability-gating checks
- Provider tests (`supabase`, `generic-rest`) and auth edge-case tests
- PMN-021 callback/state handling validation with mocked flows

2. Phase 2 integration polish (component gaps are implemented, now expand usage + QA)
- Expand real-screen usage of `SkeletonText` / `SkeletonCard`
- Test `BottomSheet` in nested scroll/gesture-heavy flows

3. Continue Phase 3 feature modules (kickoffs started, now implement real contracts)
- `PMN-070` User profile module
- `PMN-071` Settings module
- `PMN-072` Push notifications
- `PMN-073` Two-factor auth
- `PMN-074` Admin module
- `PMN-075` Help/support
- `PMN-076` Offline support

4. Final integration validation (real values / real backends / real OAuth)
- Supabase smoke tests (web + native)
- PMN-021 social auth live validation (`Google`, then future `Telegram`/`VK`)
- Real redirect/deep-link behavior verification
- Final provider diagnostics verification against live config

## Planning Doc Roles

Use this rule:

- "What is the big phase/milestone plan?" -> `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`
- "What is current status and what do we do next?" -> `docs/pmnative/ROADMAP.md` (this file)
- "What happened in recent sessions and what changed?" -> `docs/NEXT_CHAT_HANDOFF.md`

## Immediate Next Implementation Targets (Practical)

1. `PMN-070` Profile: continue from name+avatarUrl editing + capability-gated direct password update + provider-backed avatar upload (now implemented behind config/capabilities) to live validation and UX polish (on-device upload + Supabase token rotation verification, clearer unsupported-provider messaging/docs).
2. `PMN-071` Settings: Supabase settings sync adapter is implemented; continue contract docs/tests (especially `generic-rest` + Supabase metadata schema expectations) and run live validation.
3. `PMN-074` Admin: continue from users list/detail + roles list + logs list + clear logs + admin settings snapshot + role update + user status + user lock + health (provider-backed generic-rest paths started, plus inline users-list ops controls) to next endpoints/actions (per-log audit mutations and confirmations/guardrails) with provider tests/contracts first.
4. Expand mocked provider tests (auth/profile/settings/admin provider paths) on top of the `vitest` harness before live provider smoke tests.
5. Defer live Supabase/social smoke tests (Google callback/deeplink validation) to the final integration validation phase.
