# PMNative Code Analysis Report (2026-02-21)

## Scope of analysis
- Reviewed newly added PMNative bootstrap code in `pm-native/src/`.
- Focused on auth/session lifecycle, routing guards, API client behavior, and persistence edge cases.
- Verified changes with TypeScript compile check: `npx tsc -p pm-native/tsconfig.json --noEmit`.

## Issues discovered

### 1) Logout could leave stale local session on network/API failure
- Severity: High
- Area: `pm-native/src/hooks/useAuth.ts`
- Problem: `signOut()` called remote logout before local cleanup; if the API failed, local token/user could remain and user stayed effectively logged in.

### 2) Session hydration discarded valid token when user cache was missing
- Severity: High
- Area: `pm-native/src/hooks/useAuth.ts`
- Problem: startup hydration required both secure token and cached user; if cached user was absent/corrupt, code cleared session immediately without trying `/auth/session` recovery.

### 3) Auth guards used token-only checks in some routes
- Severity: Medium
- Area: `pm-native/src/app/index.tsx`, `pm-native/src/app/(auth)/_layout.tsx`, `pm-native/src/app/(tabs)/_layout.tsx`
- Problem: routing decisions used `token` without ensuring `user` exists, which could produce invalid app states during edge hydration flows.

### 4) API client network failures were not normalized to structured API errors
- Severity: Medium
- Area: `pm-native/src/services/api.ts`
- Problem: transport failures/aborts propagated as raw exceptions, breaking consistent `ApiError` handling and UI error mapping.

## Fixes implemented

1. Hardened logout cleanup path
- Updated `signOut()` to always clear secure/local session data in `finally`.
- File: `pm-native/src/hooks/useAuth.ts`

2. Improved startup session recovery
- Hydration now treats token as source of truth; if token exists but cached user is missing, it still tries `/auth/session`.
- Keeps optimistic cache restore when available and validates server-side.
- File: `pm-native/src/hooks/useAuth.ts`

3. Tightened auth guard predicates
- Updated guards to require both token and user for authenticated state.
- Files:
  - `pm-native/src/app/index.tsx`
  - `pm-native/src/app/(auth)/_layout.tsx`
  - `pm-native/src/app/(tabs)/_layout.tsx`

4. Normalized API transport failures
- Added structured handling for timeout/abort (`REQUEST_TIMEOUT`) and network transport failures (`NETWORK_ERROR`).
- Added safer JSON parsing by content type.
- File: `pm-native/src/services/api.ts`

## Remaining risks / TODO
- Token refresh handler wiring is now scaffolded in API client, but no backend refresh contract is connected yet.
- Retry/backoff is implemented for idempotent GET requests; write-path retry strategy still needs explicit policy.
- User cache is stored unencrypted in MMKV (acceptable for profile metadata, but should be explicitly documented).
- No visible toast container/UI yet; errors may be emitted but not rendered consistently.

## Next phase started (PMN-018)
- Added API client hardening primitives in `pm-native/src/services/api.ts`:
  - bounded retry/backoff for transient GET failures
  - structured timeout/network/retry-exhausted error codes
  - pluggable refresh-token handler with in-flight deduplication
- Updated auth service calls to disable refresh on auth endpoints to prevent refresh loops.

## Validation performed
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

---

## Follow-up analysis (2026-02-21, PMN-018)

### Scope of analysis
- Re-reviewed newly added PMN-018 transport hardening code:
  - `pm-native/src/services/api.ts`
  - `pm-native/src/services/auth.service.ts`
- Goal: verify retry/backoff and refresh scaffolding behavior under edge cases.

### Issues discovered

#### 5) Falsy request bodies could be dropped or incorrectly sent
- Severity: Medium
- Area: `pm-native/src/services/api.ts`
- Problem:
  - Body serialization used truthy checks, so valid payloads like `0`, `false`, or `''` were omitted.
  - GET requests could accidentally carry serialized body if caller passed one.

#### 6) Refresh handler failures could escape as non-ApiError exceptions
- Severity: Medium
- Area: `pm-native/src/services/api.ts`
- Problem: rejected refresh promises could bubble out directly and bypass normalized API error flow.

#### 7) Auth user schema could reject numeric user IDs from backend payloads
- Severity: High
- Area: `pm-native/src/services/auth.service.ts`
- Problem: schema required `id` as string only; PM backend currently returns numeric IDs in auth/session payloads.

### Fixes implemented

5. Request-body handling hardening
- Added explicit request body serializer (`undefined` check instead of truthy check).
- Prevented sending request body for GET calls.
- `Content-Type: application/json` is now set only when a body is present.
- File: `pm-native/src/services/api.ts`

6. Refresh failure normalization
- Wrapped refresh handler execution so refresh failure resolves to `null` instead of throwing untyped exceptions.
- Keeps request failure flow deterministic.
- File: `pm-native/src/services/api.ts`

7. Auth ID normalization
- Updated auth user schema to accept `id` as string or number.
- Normalized parsed `id` to string to keep app state type-stable.
- File: `pm-native/src/services/auth.service.ts`

### Validation performed (follow-up)
- `npm --prefix pm-native run typecheck` (pass)
- `npx eslint pm-native/src/services/api.ts pm-native/src/services/auth.service.ts` (pass)

---

## Second follow-up analysis (2026-02-21, refresh lifecycle)

### Scope of analysis
- Re-reviewed refreshed PMN-018 auth lifecycle after wiring token refresh:
  - `pm-native/src/hooks/useAuth.ts`
  - `pm-native/src/services/auth.service.ts`
  - `pm-native/src/services/auth.constants.ts`
- Focused on token persistence correctness and hydration behavior after `401` + refresh.

### Issues discovered

#### 8) Stale refresh token could survive new login/register sessions
- Severity: High
- Area: `pm-native/src/hooks/useAuth.ts`
- Problem: when login/register returned no refresh token, previous refresh token could remain stored and be used by future refresh attempts.

#### 9) Hydration returned early after refresh without fully restoring user
- Severity: High
- Area: `pm-native/src/hooks/useAuth.ts`
- Problem: on `/auth/session` `401`, refresh could succeed but hydration exited before re-fetching user, leaving edge cases with token restored but unresolved user state.

### Fixes implemented

8. Refresh-token replacement semantics on new sessions
- `persistSession()` now removes stored refresh token when new session payload does not include one.
- Explicit `null` refresh token during refresh rotation now removes persisted value.
- File: `pm-native/src/hooks/useAuth.ts`

9. Post-refresh user restoration in hydration
- After successful access-token refresh, hydration now re-fetches `/auth/session`.
- Fallback behavior:
  - clear session on repeated `401`
  - keep cached user only for non-auth transient failures
- File: `pm-native/src/hooks/useAuth.ts`

### Validation performed (second follow-up)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

---

## Next phase started (Phase 2 atoms)
- Began implementation of Phase 2 component library by adding:
  - `pm-native/src/components/atoms/Text.tsx`
  - `pm-native/src/components/atoms/Input.tsx`
- Migrated auth screens to consume these atoms:
  - `pm-native/src/app/(auth)/login.tsx`
  - `pm-native/src/app/(auth)/register.tsx`
  - `pm-native/src/app/(auth)/forgot-password.tsx`
- Validation: `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)
- Continued Phase 2 with initial `Icon` atom scaffold: `pm-native/src/components/atoms/Icon.tsx`.

---

## Third follow-up analysis (2026-02-21, auth contract + atom migration)

### Scope of analysis
- Reviewed newest PMNative code changes focused on:
  - auth contract interoperability (`pm-native/src/services/api.ts`, `pm-native/src/services/auth.service.ts`)
  - auth screen migration to atoms (`pm-native/src/app/(auth)/*`)
  - text atom typing (`pm-native/src/components/atoms/Text.tsx`)

### Issues discovered

#### 10) Auth token could leak into unauthenticated endpoints
- Severity: Medium
- Area: `pm-native/src/services/api.ts`, `pm-native/src/services/auth.service.ts`
- Problem: API client auto-attached token from handler even for login/register/refresh calls, potentially sending stale auth headers on unauthenticated endpoints.

#### 11) Login/register payload parsing too strict for backend variants
- Severity: High
- Area: `pm-native/src/services/auth.service.ts`
- Problem: auth session parsing accepted only `{ token, user }`, but backend contracts may return `{ accessToken, user }` or success-envelope payloads.

#### 12) Auth screens lost explicit theme background after atom migration
- Severity: Low
- Area: `pm-native/src/app/(auth)/login.tsx`, `pm-native/src/app/(auth)/register.tsx`, `pm-native/src/app/(auth)/forgot-password.tsx`
- Problem: screen root views no longer set `backgroundColor`, causing visual inconsistency.

#### 13) `Text` atom children typing too narrow
- Severity: Low
- Area: `pm-native/src/components/atoms/Text.tsx`
- Problem: `children` typed as `string` only; prevented valid React text nodes and reduced component reusability.

### Fixes implemented

10. Explicit auth-header control for API requests
- Added `useAuthToken?: boolean` request option.
- Disabled auth-token injection for login/register/logout/refresh calls.
- Files:
  - `pm-native/src/services/api.ts`
  - `pm-native/src/services/auth.service.ts`

11. Flexible auth session normalization
- Added auth session payload union and normalization for:
  - `token`
  - `accessToken`
  - `success.data` envelope variants
- File: `pm-native/src/services/auth.service.ts`

12. Restored themed auth screen backgrounds
- Added `backgroundColor: colors.background` to auth screen containers.
- Files:
  - `pm-native/src/app/(auth)/login.tsx`
  - `pm-native/src/app/(auth)/register.tsx`
  - `pm-native/src/app/(auth)/forgot-password.tsx`

13. Broadened Text atom children typing
- Updated `Text` atom to accept `ReactNode` children.
- File: `pm-native/src/components/atoms/Text.tsx`

### Validation performed (third follow-up)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)
- `npx eslint ...` on touched PMNative files (no errors; root ESLint config currently ignores some PMNative paths and reports warnings)
- Continued Phase 2 by adding `Badge` atom and integrating role badge in profile screen (`pm-native/src/app/(tabs)/profile.tsx`).

---

## Fourth follow-up analysis (2026-02-21, newly added Phase 2 atoms)

### Scope of analysis
- Reviewed newly added atom implementations and immediate integrations:
  - `Avatar`, `Divider`, `Spinner`, `Switch`, `Checkbox`
  - `pm-native/src/app/(tabs)/settings.tsx`
  - `pm-native/src/app/(tabs)/profile.tsx`
- Focused on runtime edge cases and UI lifecycle safety.

### Issues discovered

#### 14) Avatar image path had no runtime fallback on load failure
- Severity: Medium
- Area: `pm-native/src/components/atoms/Avatar.tsx`
- Problem: if remote avatar URL failed, component could stay in broken-image state with no initials fallback.

#### 15) Settings logout flow risked state update after unmount
- Severity: Medium
- Area: `pm-native/src/app/(tabs)/settings.tsx`
- Problem: async `signOut()` can trigger navigation/unmount while `finally` still tries `setLoggingOut(false)`.

### Fixes implemented

14. Avatar fallback and accessibility hardening
- Added local image error state.
- On image load failure, avatar now falls back to initials rendering.
- Added accessibility label on image avatar.
- File: `pm-native/src/components/atoms/Avatar.tsx`

15. Unmount-safe logout loading state
- Added mount guard ref to avoid state update after unmount in logout flow.
- File: `pm-native/src/app/(tabs)/settings.tsx`

### Validation performed (fourth follow-up)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

### Remaining risks / TODO (phase-specific)
- `Spinner` and `Divider` atoms are integrated but not yet covered by tests.
- `Switch` and `Checkbox` currently use local screen state only; persistence wiring is pending for settings module phase.
- ESLint project config does not fully target PMNative files yet (warnings indicate unmatched config for some paths).

---

## Fifth follow-up analysis (2026-02-22, atom integration regressions)

### Scope of analysis
- Re-reviewed latest atom + tab integrations from `0be30b4` and related molecule compatibility:
  - `pm-native/src/components/atoms/Text.tsx`
  - `pm-native/src/components/atoms/Avatar.tsx`
  - `pm-native/src/app/(tabs)/settings.tsx`
  - `pm-native/src/components/molecules/Card.tsx`
- Re-ran TypeScript validation over PMNative workspace.

### Issues discovered

#### 16) `Text` atom did not accept external `style` prop
- Severity: Medium
- Area: `pm-native/src/components/atoms/Text.tsx`
- Problem: `Card` (and future consumers) passed style overrides to `Text`, but `TextProps` had no `style` field and failed compile.

#### 17) Avatar image failure state did not recover for new URL input
- Severity: Medium
- Area: `pm-native/src/components/atoms/Avatar.tsx`
- Problem: after one image load failure, `imageFailed` stayed true even when parent provided a different valid `imageUrl`.

#### 18) Logout action allowed rapid re-entry while in-flight
- Severity: Low
- Area: `pm-native/src/app/(tabs)/settings.tsx`
- Problem: `handleLogout` could be triggered multiple times before first request completed, producing duplicate sign-out calls.

### Fixes implemented

16. Restored `Text` style passthrough compatibility
- Added optional `style?: StyleProp<TextStyle>` to `TextProps`.
- Forwarded incoming style to native text style array.
- File: `pm-native/src/components/atoms/Text.tsx`

17. Added Avatar source-change recovery
- Normalized and narrowed avatar URL to a non-null string.
- Reset `imageFailed` when `imageUrl` changes so a new source can render.
- File: `pm-native/src/components/atoms/Avatar.tsx`

18. Prevented duplicate logout submissions
- Added in-flight guard in `handleLogout`.
- Disabled logout button while logout is running and updated label to loading state.
- File: `pm-native/src/app/(tabs)/settings.tsx`

### Validation performed (fifth follow-up)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

### Remaining risks / TODO (updated)
- `FormField` now supports label/required/helper/error, but field-level validation rules are still screen-local and not centralized.
- Atom/molecule coverage is still type-check only; no unit tests exist yet for new UI primitives.

## Next phase started (PMN-040/PMN-041)
- Expanded `pm-native/src/components/molecules/FormField.tsx` with:
  - required indicator
  - helper/error text support
  - migration-ready wrapper usage for auth forms
- Migrated auth screens to use `FormField`:
  - `pm-native/src/app/(auth)/login.tsx`
  - `pm-native/src/app/(auth)/register.tsx`
  - `pm-native/src/app/(auth)/forgot-password.tsx`
- Added `pm-native/src/components/molecules/ListItem.tsx` and integrated it into:
  - `pm-native/src/app/(tabs)/settings.tsx`
- Updated `pm-native/src/components/atoms/Switch.tsx` for compact no-label layout support in list trailing actions.

### Validation performed (phase-start)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Next phase continued (PMN-042)
- Added molecule components:
  - `pm-native/src/components/molecules/EmptyState.tsx`
  - `pm-native/src/components/molecules/ErrorState.tsx`
  - `pm-native/src/components/molecules/SearchBar.tsx`
- Upgraded `pm-native/src/components/molecules/Card.tsx` with optional header-trailing and footer slots.
- Integrated molecules into admin screens:
  - `pm-native/src/app/(admin)/index.tsx` now supports searchable admin sections and empty-state fallback.
  - `pm-native/src/app/(admin)/users.tsx` now handles no-session error state and searchable user list fallback.
  - `pm-native/src/app/(admin)/settings.tsx` now surfaces config-driven feature flags via reusable list cards.

### Validation performed (PMN-042)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Molecule completion continuation (2026-02-22)
- Added missing planned wrappers:
  - `pm-native/src/components/molecules/SectionHeader.tsx`
  - `pm-native/src/components/molecules/KeyboardAvoidingView.tsx`
- Integrated these wrappers into existing flows:
  - auth pages now use keyboard-aware layout wrappers:
    - `pm-native/src/app/(auth)/login.tsx`
    - `pm-native/src/app/(auth)/register.tsx`
    - `pm-native/src/app/(auth)/forgot-password.tsx`
  - admin pages now use consistent section headers:
    - `pm-native/src/app/(admin)/index.tsx`
    - `pm-native/src/app/(admin)/users.tsx`
    - `pm-native/src/app/(admin)/settings.tsx`

### Validation performed (molecule continuation)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Next phase started (PMN-050/PMN-051 organisms)
- Added auth form organisms:
  - `pm-native/src/components/organisms/LoginForm.tsx`
  - `pm-native/src/components/organisms/RegisterForm.tsx`
- Refactored auth screens to consume these organisms:
  - `pm-native/src/app/(auth)/login.tsx`
  - `pm-native/src/app/(auth)/register.tsx`
- Existing auth side-effects remain screen-owned (`useAuth`, routing, toast handling), while input/UI composition moved to reusable organisms.

### Validation performed (organism start)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Organism continuation (PMN-052 ToastContainer)
- Added `pm-native/src/components/organisms/ToastContainer.tsx` with:
  - auto-dismiss lifecycle
  - tap-to-dismiss interaction
  - variant-aware visuals for `success | error | warning | info`
- Mounted container in `pm-native/src/app/_layout.tsx` so `useToast()` messages are now visible in UI.
- Hardened toast store behavior in `pm-native/src/stores/ui.store.ts`:
  - reduced toast ID collision risk by adding random suffix
  - bounded toast queue length to last 5 messages

### Validation performed (PMN-052)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Organism continuation (PMN-053 ConfirmDialog)
- Added `pm-native/src/components/organisms/ConfirmDialog.tsx` and mounted it in root layout.
- Added `pm-native/src/hooks/useConfirm.ts` for promise-based confirmation flow.
- Extended `pm-native/src/stores/ui.store.ts` with confirm dialog state and resolver actions.
- Integrated confirmation into destructive logout action in `pm-native/src/app/(tabs)/settings.tsx`.

### Validation performed (PMN-053)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Organism continuation (PMN-054 ScreenHeader)
- Added `pm-native/src/components/organisms/ScreenHeader.tsx`.
- Integrated shared header organism into tab screens:
  - `pm-native/src/app/(tabs)/index.tsx`
  - `pm-native/src/app/(tabs)/profile.tsx`
  - `pm-native/src/app/(tabs)/settings.tsx`

### Validation performed (PMN-054)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)

## Architecture pivot (2026-02-22): remove PM backend assumptions
- Direction clarified: PMNative is new code and should not preserve PM backend compatibility patterns.
- Added provider-based auth architecture so core auth logic no longer embeds backend-specific endpoint assumptions:
  - `pm-native/src/services/auth/provider.types.ts`
  - `pm-native/src/services/auth/provider.ts`
  - `pm-native/src/services/auth/providers/genericRestAuthProvider.ts`
- Refactored `pm-native/src/hooks/useAuth.ts` to use the provider contract.
- Removed legacy `pm-native/src/services/auth.service.ts`.
- Added backend provider configuration to PMNative config/types/validation.
- Added PMNative-local documentation:
  - `pm-native/docs/BACKEND_PROVIDER_STRATEGY.md`
  - `pm-native/docs/REPO_SPLIT_CRITERIA.md`

### Validation performed (architecture pivot)
- `npx tsc -p pm-native/tsconfig.json --noEmit` (pass)
