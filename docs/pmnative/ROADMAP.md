# PMNative Roadmap (Index)

This repo does have a roadmap, but the canonical file is:

- `docs/pmnative/PMNative_Implementation_Epic_—_Phases,_Milestones_&_MVP.md`

Related planning docs:

- `docs/pmnative/PMNative_Architecture_Proposal_—_React_Native_Framework_Design.md`
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md`
- `docs/pmnative/PMN-021_AUTH_TEST_MATRIX.md`
- `docs/NEXT_CHAT_HANDOFF.md` (current status + immediate priorities)

## What Comes After Auth (Current Practical Sequence)

Auth is not "done-done" yet; it is in validation + extension mode:

1. Finish auth validation and tests
- Core auth regression (email login/register/forgot/logout/hydration/refresh)
- PMN-021 social auth validation (Google web/native)
- Telegram/VK capability-gating checks
- Provider tests (`supabase`, `generic-rest`) and auth edge-case tests

2. Finish remaining Phase 2 component-library gaps
- `PMN-060`: loading/skeleton states
  - `SkeletonText`
  - `SkeletonCard`
  - `SkeletonList`
  - `LoadingOverlay`
- Remaining organism work from `PMN-054`
  - `BottomSheet`

3. Then move into Phase 3 feature modules
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
