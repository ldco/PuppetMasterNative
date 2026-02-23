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
- `PMN-074` admin users provider-backed list path has started:
  - `generic-rest` admin users endpoint support (`backend.genericRest.admin.endpoints.listUsers`) is implemented and config-gated
  - admin user-detail route/provider path is implemented (`backend.genericRest.admin.endpoints.getUser`, config-gated)
- Module architecture cleanup pass completed:
  - shared settings store (`useSettingsStore`)
  - explicit service inputs (no hidden global store reads in services)
  - safer async loading/refresh/error hook contracts
- Settings sync contract scaffolding started:
  - typed preview + draft payload (`pmnative.settings.sync/1`)
  - provider-facing `settingsSyncProvider` contract (`generic-rest` execution path implemented, config-gated)
  - `supabase` settings sync remains unsupported (now capability-gated in admin settings UI)
- Test harness has started (non-UI, service/provider level):
  - `vitest` setup added (`npm test`, `npm run test:watch`)
  - initial tests added for `settingsSyncService`, `settingsSyncProvider`, and `profileService`

What is not finished:

- Full provider-backed admin module APIs are not implemented yet (only users list remote path has started)
- Profile editing UX is basic (display name only) and needs broader profile field contract decisions
- `supabase` settings sync adapter or an explicit non-goal decision
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

1. `PMN-070` Profile: add `profileProvider` tests (generic-rest payload normalization + Supabase error mapping) and resolve/document the token-rotation contract gap from Supabase `setSession(...)` during profile update.
2. `PMN-071` Settings: keep Supabase settings sync unsupported for now (capability-gated), and continue `generic-rest` contract tests/docs until a Supabase adapter is explicitly approved/in-scope.
3. `PMN-074` Admin: extend provider tests/contracts and decide next admin endpoints (`roles`/`settings`) before wiring more admin actions in UI.
4. Expand mocked provider tests (auth/profile/settings/admin provider paths) on top of the `vitest` harness before live provider smoke tests.
5. Defer live Supabase/social smoke tests (Google callback/deeplink validation) to the final integration validation phase.
