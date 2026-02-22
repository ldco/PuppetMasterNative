# PMNative DNA Extraction Audit (from Puppet Master Framework)

Last updated: 2026-02-22
Status: In progress, but far enough to split soon

## Purpose

This audit tracks what PMNative has already extracted from Puppet Master (PM) framework DNA, what is intentionally excluded, and what remains worth copying before moving PMNative to its own repository.

PMNative is a new product and does not preserve PM backend compatibility.

## What We Already Extracted (keep)

### 1. Config-driven architecture
- `pm-native/src/pm-native.config.ts`
- `pm-native/src/hooks/useConfig.ts`
- `pm-native/src/types/config.ts`
- `pm-native/src/utils/validation.ts`

What was extracted from PM:
- feature flags
- module metadata patterns
- role-aware admin section filtering
- runtime config validation

### 2. RBAC / role model concepts
- Roles: `master`, `admin`, `editor`, `user`
- Role hierarchy helpers and admin module access filtering

What was extracted from PM:
- role naming and hierarchy semantics
- config-driven access checks

### 3. Atomic component architecture
- Atoms implemented (`Text`, `Input`, `Button`, `Icon`, `Avatar`, `Badge`, `Divider`, `Spinner`, `Switch`, `Checkbox`)
- Molecules implemented (`FormField`, `ListItem`, `Card`, `EmptyState`, `ErrorState`, `SearchBar`, `SectionHeader`, `KeyboardAvoidingView`)
- Organisms implemented (`LoginForm`, `RegisterForm`, `ToastContainer`, `ConfirmDialog`, `ScreenHeader`)

What was extracted from PM:
- atomic layering discipline
- reusable composition-first UI design
- admin-shell UI structure patterns

### 4. Design tokens + theming patterns
- theme primitives + semantic color generation
- `useTheme()` abstraction
- dark/light/system mode support

What was extracted from PM:
- token-first design approach
- semantic color mapping mindset
- centralized theme mode control

### 5. App structure / routing patterns
- Expo Router group routing (`(auth)`, `(tabs)`, `(admin)`)
- route guard behavior and role-aware admin access
- root provider layout (query client, auth hydration, overlays)

What was extracted from PM:
- framework shell organization
- provider-based root composition
- config-aware navigation/guards

### 6. Validation and typed contracts mindset
- Zod-based config/auth input validation
- typed API client and auth types
- provider contract interface for backend integration

What was extracted from PM:
- typed + validated contracts across layers

## What We Intentionally Do NOT Extract (remove / avoid)

### 1. PM backend runtime contract
- PM auth endpoints as a hard dependency
- PM JWT/refresh semantics in core auth hook
- PM server runtime assumptions

Status:
- Removed from core auth architecture (provider-based auth is now in place)
- `generic-rest` remains as an optional provider contract, not PM-specific runtime dependency

### 2. PM web/Nuxt implementation details
- Nuxt/Nitro/H3 APIs
- Drizzle ORM / SQLite server implementation
- PM CSS layer architecture (web-specific)
- Vue component conventions

Reason:
- PMNative is React Native / Expo, not Nuxt web framework

## What Is Still Worth Extracting Before Split (optional but valuable)

These are framework ideas/patterns, not backend coupling:

### High value
1. PM module-spec conventions
- Define a stronger PMNative module manifest format (screen registration, permissions, feature flags, settings schema)

2. PM admin extensibility patterns
- Formalize admin module registry and per-module capability metadata

3. PM i18n conventions
- Add translation namespace conventions and fallback strategy docs

4. PM security UX patterns
- Explicit error messaging standards
- confirmation flows for privileged actions (already started with `ConfirmDialog`)

### Medium value
1. PM auditability mindset
- local event logging hooks / analytics abstraction (provider-neutral)

2. PM setup workflow documentation quality
- better init/setup docs and environment templates

## What We Already Have That Makes Split Practical

1. PMNative-local docs folder exists (`pm-native/docs/`)
2. Backend provider strategy documented (Supabase-first, backend-agnostic)
3. Repo split criteria documented
4. Generic REST provider contract documented
5. Supabase provider implemented locally
6. PM backend assumptions removed from core auth flow

## Remaining Work Before Repo Split (recommended)

### Required
1. Verify PMNative runs cleanly with Supabase provider in local Expo environment
2. Move roadmap/handoff ownership fully into `pm-native/docs/` (stop relying on root docs)

### Strongly recommended
1. Tests for auth providers and auth hydration edge cases
2. PMN-060 loading/skeleton states
3. `BottomSheet` organism (remaining planned Phase 2 organism item)
4. Provider diagnostics route/screen for setup validation outside admin role (admin diagnostics card already added)

## Split Readiness Assessment

Current assessment: `NEARLY READY`

Why not "ready" yet:
- Supabase provider needs runtime verification against a real project
- PMNative roadmap/handoff ownership still partially references root PM docs

Expected next milestone:
- After Supabase smoke test + PMNative-local roadmap/handoff ownership cleanup, PMNative can be moved to its own repo and continued there.
