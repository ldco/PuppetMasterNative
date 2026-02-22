# PMNative Next Chat Handoff (for new repo)

Last updated: 2026-02-22
Status: Local-only changes in PM repo workspace (do not commit/push here)

## Ground Rules (important)

- PMNative is a new project.
- Do not optimize for backward compatibility with Puppet Master backend.
- Supabase is the default provider, but PMNative must remain backend-agnostic.
- No more PMNative commits/pushes to the PuppetMaster2 repo.

## Current Architecture Direction

### Backend
- Provider-based auth architecture (`AuthProvider`) is now the core contract.
- Implemented providers:
  - `supabase` (default)
  - `generic-rest` (configurable auth endpoints)
- PM backend assumptions were removed from core auth hook.
- Supabase-first provider flow is implemented locally (client + auth provider + provider selector).

### UI / Components
- Phase 2 component library is largely implemented:
  - atoms: complete set for current bootstrap scope
  - molecules: core set implemented
  - organisms: `LoginForm`, `RegisterForm`, `ToastContainer`, `ConfirmDialog`, `ScreenHeader` implemented

### Auth UX
- `forgot-password` screen now uses real provider method
- Supabase registration supports email-confirmation-required flow (no session returned)
- logout uses confirmation dialog and remains locally successful even if remote revoke fails
- auth hydration refresh path now recognizes provider-level unauthorized errors (not only REST `ApiError(401)`)

## Files Added / Updated Locally (not committed in PM repo)

### New PMNative docs
- `pm-native/docs/PM_DNA_EXTRACTION_AUDIT.md`
- `pm-native/docs/NEXT_CHAT_HANDOFF.md`
- `pm-native/docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`
- `pm-native/docs/SUPABASE_SETUP.md`
- `pm-native/docs/BACKEND_PROVIDER_STRATEGY.md` (updated)
- `pm-native/docs/REPO_SPLIT_CRITERIA.md`

### Backend/provider refactor and Supabase integration
- `pm-native/src/services/auth/provider.types.ts`
- `pm-native/src/services/auth/provider.ts`
- `pm-native/src/services/auth/providers/genericRestAuthProvider.ts`
- `pm-native/src/services/auth/providers/supabaseAuthProvider.ts`
- `pm-native/src/services/supabase.client.ts`
- `pm-native/src/hooks/useAuth.ts`
- `pm-native/src/types/auth.ts`
- `pm-native/src/types/config.ts`
- `pm-native/src/utils/validation.ts`
- `pm-native/src/pm-native.config.ts`
- `pm-native/src/app/(auth)/forgot-password.tsx`
- `pm-native/src/app/(auth)/register.tsx`
- `pm-native/src/app/(admin)/settings.tsx` (backend diagnostics card)
- `pm-native/src/hooks/useBackendDiagnostics.ts`
- `pm-native/package.json`
- `pm-native/package-lock.json`
- `pm-native/.env.example`
- `pm-native/README.md`

## Verified

- `npx tsc -p pm-native/tsconfig.json --noEmit` passes after latest changes.
- Admin Settings now includes backend provider/environment diagnostics UI.
- Supabase registration flow now supports email confirmation projects (no immediate session).

## Known Remaining Risks / TODO

### Before repo split (recommended)
1. Run Supabase smoke test in Expo against a real project:
   - sign up (with and without email confirmation)
   - sign in
   - session hydrate
   - refresh
   - forgot password
   - sign out
2. Copy/move PMNative roadmap state from root docs into `pm-native/docs/` so PM repo docs are no longer required.
3. Optional but useful: add a small provider diagnostics route/screen outside admin area for non-admin setup validation.

### Next implementation priorities (after split preferred)
1. PMN-060 loading/skeleton states
   - `SkeletonText`, `SkeletonCard`, `SkeletonList`, `LoadingOverlay`
2. Remaining organism item
   - `BottomSheet`
3. Tests
   - provider tests (`supabase`, `generic-rest`)
   - auth hydration/refresh edge cases
4. Provider diagnostics / setup validation screen
   - show active provider
   - show missing env vars

## Repo Split Recommendation

PMNative is now `READY TO MOVE` to its own repository for continued development.

Recommended immediate move plan:
- move now
- run Supabase smoke test in new repo as first validation step
- continue roadmap docs migration in new repo

## First Tasks in the New Repo (suggested order)

1. Create PMNative repo and move `pm-native/` contents into repo root
2. Preserve local uncommitted changes from this workspace (copy working tree files, not just git history)
3. Add `.env` from `.env.example` with Supabase values
4. Run Expo app and complete Supabase smoke test
5. Add provider tests (`supabase`, `generic-rest`) and continue Phase 2 completion (`BottomSheet`, skeleton/loading states)

## Migration Note (important)

Because `pm-native/` is ignored in the parent PM repo, some new files may not appear in normal `git status`.
When moving to the new repo, copy the full `pm-native/` folder from disk (including:
- `src/services/supabase.client.ts`
- `src/services/auth/providers/supabaseAuthProvider.ts`
- `src/hooks/useBackendDiagnostics.ts`
- docs and `.env.example`)
rather than relying on parent-repo git tracking.
