# PMNative Carry-Over Analysis (from Puppet Master)

## Goal
Identify which Puppet Master framework capabilities should be inherited before PMNative is extracted to a standalone repository.

## What Should Be Carried Over

### 1) Config-first runtime model (High Priority)
From PM:
- Single source of truth config
- Derived helpers in `useConfig()`
- Role-aware section generation

PMNative action:
- Keep `src/pm-native.config.ts` as architectural hub
- Expose derived booleans and section helpers in `useConfig()`
- Keep route + module visibility config-driven

Status: **Implemented now**

### 2) RBAC model with hierarchy/levels (High Priority)
From PM:
- `ROLE_LEVELS`
- role inheritance + section filtering

PMNative action:
- Use level-based checks for guards
- Keep config-declared role matrix
- Filter admin sections by role

Status: **Implemented now**

### 3) Admin modules as declarative config (High Priority)
From PM:
- module toggles + allowed roles
- nav generated from config

PMNative action:
- Add typed admin module map in config
- Generate admin sections from modules

Status: **Implemented now (users/settings enabled; others scaffolded)**

### 4) Validation-first boundaries (High Priority)
From PM:
- centralized Zod schemas

PMNative action:
- Validate full config shape at startup
- keep request payload schemas in `src/utils/validation.ts`

Status: **Implemented now**

### 5) Security observability (Medium Priority)
From PM:
- audit logging helpers for auth/privileged actions

PMNative action:
- add client-side security event envelope (`auth_login_failed`, `role_guard_denied`)
- wire to backend audit endpoint when API adapter is chosen

Status: **Next (Phase 1/3)**

### 6) UX infra composables (Medium Priority)
From PM:
- `useToast`, `useConfirm`

PMNative action:
- keep hook-first UX API
- add `ConfirmDialog` + `useConfirm` in organism phase

Status: **Toast partial, Confirm pending (Phase 2)**

## Roadmap Step Implemented in This Pass

Implemented **Phase 1 - PMN-017 (session bootstrap and secure-store hydration)** on top of previously completed PMN-011/012:
- centralized role-level checks used by tabs/admin layouts
- config-driven admin access controls
- root route redirect based on auth state
- safe-area provider added to root layout
- secure token + cached user restoration on app startup
- session verification against `/auth/session` with 401 invalidation cleanup

## Recommended Next Step

Implement **PMN-018 (API layer hardening)** with retry/backoff, structured API error codes, and authenticated refresh flow; then continue to **Phase 2 PMN-031/032** (Text/Input atoms).
