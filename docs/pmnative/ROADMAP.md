# PMNative Roadmap (Index + Current State)

This repo does have a roadmap, but the canonical file is:

- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`

Related planning docs:

- `docs/pmnative/PMNative_Architecture_Proposal_—_React_Native_Framework_Design.md`
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md`
- `docs/pmnative/PMN-021_AUTH_TEST_MATRIX.md`
- `docs/NEXT_CHAT_HANDOFF.md` (current status + immediate priorities)

## Current State (2026-02-22)

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
- `PMN-074` admin users provider-backed list path has started:
  - `generic-rest` admin users endpoint support (`backend.genericRest.admin.endpoints.listUsers`) is implemented and config-gated
- Module architecture cleanup pass completed:
  - shared settings store (`useSettingsStore`)
  - explicit service inputs (no hidden global store reads in services)
  - safer async loading/refresh/error hook contracts
- Settings sync contract scaffolding started:
  - typed preview + draft payload (`pmnative.settings.sync/1`)
  - provider-facing `settingsSyncProvider` contract (`generic-rest` execution path implemented, config-gated)

What is not finished:

- Full provider-backed admin module APIs are not implemented yet (only users list remote path has started)
- `PMN-070` profile update contract/endpoint (`update`) is not implemented yet
- `supabase` settings sync adapter or an explicit non-goal decision
- Full auth test matrix execution (especially interactive Supabase/social smoke tests)
- Telegram/VK runtime social auth adapters (currently capability-gated/doc-planned)

## What Comes After Auth (Current Practical Sequence)

Auth is not "done-done" yet; it is in validation + extension mode:

1. Finish auth validation and tests
- Core auth regression (email login/register/forgot/logout/hydration/refresh)
- PMN-021 social auth validation (Google web/native)
- Telegram/VK capability-gating checks
- Provider tests (`supabase`, `generic-rest`) and auth edge-case tests

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

## Why It Feels Unclear

The roadmap is currently split across:

- the implementation epic (long-term plan)
- `docs/NEXT_CHAT_HANDOFF.md` (what is next right now)
- ticket-specific docs like `PMN-021_SOCIAL_AUTH.md`

Use this rule:

- "What is the big roadmap?" -> `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`
- "What do we do next in this branch/session?" -> `docs/NEXT_CHAT_HANDOFF.md`

## Immediate Next Implementation Targets (Practical)

1. `PMN-071` Settings: document/test the `generic-rest` settings sync contract and decide whether `supabase` gets an adapter or remains unsupported
2. `PMN-070` Profile: document/test generic-rest profile fetch contract and implement profile update endpoint contract (`update`)
3. `PMN-074` Admin: document/test generic-rest admin users list contract, then add roles/settings endpoints and replace remaining placeholder admin flows
4. Execute auth/provider tests + Supabase smoke tests once runtime credentials/config are ready
