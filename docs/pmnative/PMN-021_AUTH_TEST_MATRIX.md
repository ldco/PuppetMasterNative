# PMN-021 + Core Auth Test Matrix (PMNative)

## Purpose

This matrix defines the full auth test scope for PMNative while PMN-021 (social auth) is in progress.

It covers:

- core email/password auth regression
- social auth flows (`Google`, `Telegram`, `VK`)
- callback/deep-link/auth-session behavior
- admin diagnostics / DX checks
- provider contract behavior (`supabase`, `generic-rest`)

## Important Auth Semantics (Read First)

### Email/Password Auth (Traditional)

Email/password auth preserves the classic two-step mental model:

- `register` creates an account
- `login` authenticates an existing account

### Social Auth (`Google`, `Telegram`, `VK`)

Social auth should be treated as a unified "continue with provider" flow:

- first successful provider auth may create the app account and sign the user in
- later provider auth signs the same user in again

This means:

- the `login` and `register` screen buttons are UI entry points / user intent
- they are not strictly separate backend lifecycles for social providers
- PMNative still tracks intent (`login` vs `register`) for UX, routing, and callback correlation

Implication for testing:

- on social auth, test both entry points (`Login` screen and `Register` screen)
- expect both to end in an authenticated session when provider auth succeeds
- do not require "register first, login later" for social provider flows

## Current Implementation Snapshot (for Expected Results)

- `supabase` provider:
  - `Google`: runtime path implemented
  - `Telegram`: capability-gated / not implemented
  - `VK`: capability-gated / not implemented
- `generic-rest` provider:
  - social auth methods currently `NOT_SUPPORTED`

## Test Execution Modes

- `Automated now`: can run in terminal/CI (typecheck/static checks)
- `Manual interactive`: requires browser/device login interaction
- `Future automated`: should become unit/integration/e2e coverage later

## Test Matrix

| ID | Area | Provider | Platform | Scenario | Preconditions | Expected Result | Mode | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-001 | Core auth | Supabase | Web/Native | Email login success | Valid `.env`, provider=`supabase` | User reaches protected screen, session persisted | Manual interactive | P0 |
| AUTH-002 | Core auth | Supabase | Web/Native | Email login invalid password | Same as AUTH-001 | Typed/user-readable error, no crash, no partial session | Manual interactive | P0 |
| AUTH-003 | Core auth | Supabase | Web/Native | Email register returns session | Supabase project allows immediate session | Account created, authenticated session stored | Manual interactive | P0 |
| AUTH-004 | Core auth | Supabase | Web/Native | Email register requires confirmation | Supabase email confirmation enabled | Success message shown, redirected to login, no broken state | Manual interactive | P0 |
| AUTH-005 | Core auth | Supabase | Web/Native | Forgot password request | Valid Supabase env | Reset request succeeds with user-readable feedback | Manual interactive | P1 |
| AUTH-006 | Core auth | Supabase | Web/Native | Logout after email auth | Logged in user | Local session cleared even if remote revoke fails | Manual interactive | P0 |
| AUTH-007 | Core auth | Supabase | Web/Native | Session hydration on restart | Existing valid stored session | App restores authenticated state | Manual interactive | P0 |
| AUTH-008 | Core auth | Supabase | Web/Native | Refresh token path on expired access token | Session with valid refresh token | Access token refreshed, user remains logged in | Manual interactive | P1 |
| AUTH-009 | Core auth | Supabase | Web/Native | Expired/invalid refresh token | Invalid refresh token stored | Local session cleared safely, no crash | Manual interactive | P1 |
| AUTH-010 | Core auth | Generic REST | Web/Native | Email login/register/logout/session/refresh contract regression | `backend.provider='generic-rest'`, working API | Existing generic-rest auth behavior unchanged | Manual interactive | P1 |
| SOC-001 | Social auth | Google (Supabase) | Web | Login-screen Google success | `.env` valid, `google=true`, Google provider enabled in Supabase, redirect URLs configured | Auth succeeds, callback returns to PMNative, session created | Manual interactive | P0 |
| SOC-002 | Social auth | Google (Supabase) | Web | Register-screen Google success (first-time user) | Same as SOC-001 with new Google user | Auth succeeds, account/session created, lands in protected screen | Manual interactive | P0 |
| SOC-003 | Social auth | Google (Supabase) | Web | Register-screen Google repeat auth (existing user) | Same user previously used Google | Auth succeeds (acts like sign-in), no duplicate-flow assumption required | Manual interactive | P0 |
| SOC-004 | Social auth | Google (Supabase) | Web | Login-screen Google cancel | Same as SOC-001 | User-readable cancelled error, no crash, no session | Manual interactive | P1 |
| SOC-005 | Social auth | Google (Supabase) | Web | Callback missing/invalid params | Open `/oauth-callback` directly or malformed callback | Error toast + safe redirect to login, no stuck spinner | Manual interactive | P1 |
| SOC-006 | Social auth | Google (Supabase) | Web | Callback with missing pending context | Start no flow, open callback URL manually | Callback rejected, safe redirect to login | Manual interactive | P1 |
| SOC-007 | Social auth | Google (Supabase) | Web | Callback provider/mode mismatch | Corrupt callback params or stale context | Callback rejected with typed error | Manual interactive | P1 |
| SOC-008 | Social auth | Google (Supabase) | Native | Login-screen Google success (auth-session path) | Native runtime, Google enabled, callbacks configured | `expo-web-browser` auth session completes, session created | Manual interactive | P0 |
| SOC-009 | Social auth | Google (Supabase) | Native | Register-screen Google success (auth-session path) | Same as SOC-008 | Session created; register entry acts as social continue flow | Manual interactive | P0 |
| SOC-010 | Social auth | Google (Supabase) | Native | Auth-session cancel/dismiss | Same as SOC-008 | Cancelled message, no crash, no partial session | Manual interactive | P1 |
| SOC-011 | Social auth | Google (Supabase) | Native | Fallback path (if auth-session unavailable) | Environment where auth session cannot open | Fallback deep-link path works or fails gracefully | Manual interactive | P1 |
| SOC-012 | Social auth | Google (Supabase) | Web/Native | Disabled Google flag | `backend.socialAuth.google=false` | Google button hidden; callback completion blocked by config gate | Manual + static | P0 |
| SOC-013 | Social auth | Telegram | Supabase | Capability gating (current) | `telegram=false` or unsupported provider | Button hidden and/or typed `NOT_SUPPORTED`; no raw SDK errors | Manual + static | P0 |
| SOC-014 | Social auth | Telegram | Supabase | Misconfigured enablement (future-proof negative test) | `telegram=true` while adapter unsupported | Graceful typed `NOT_SUPPORTED`, no crash | Manual + static | P1 |
| SOC-015 | Social auth | VK | Supabase | Capability gating (current) | `vk=false` or unsupported provider | Button hidden and/or typed `NOT_SUPPORTED`; no raw SDK errors | Manual + static | P0 |
| SOC-016 | Social auth | VK | Supabase | Misconfigured enablement (future-proof negative test) | `vk=true` while adapter unsupported | Graceful typed `NOT_SUPPORTED`, no crash | Manual + static | P1 |
| SOC-017 | Social auth | Generic REST | Web/Native | Social methods unimplemented contract behavior | `backend.provider='generic-rest'` | Typed `NOT_SUPPORTED` for social methods | Manual + future automated | P1 |
| DX-001 | Diagnostics | N/A | Web/Native | Backend diagnostics provider/env rows | Admin Settings accessible | Correct provider + env diagnostics shown | Manual interactive | P1 |
| DX-002 | Diagnostics | N/A | Web/Native | Social readiness rows (`Google`, `Telegram`, `VK`) | Admin Settings accessible | Status rows reflect config/provider support accurately | Manual interactive | P1 |
| DX-003 | Diagnostics | N/A | Web/Native | Runtime callback URL row | Admin Settings accessible | Runtime callback URL shown or clear warning | Manual interactive | P1 |
| DX-004 | Diagnostics | N/A | Web/Native | Copy callback URL rows | Clipboard available | Tap copies runtime/web callback URL, success toast shown | Manual interactive | P1 |
| DX-005 | Diagnostics | N/A | Web/Native | Copy allow-list snippet/checklist | Clipboard available | Tap copies generated snippet/checklist, success toast shown | Manual interactive | P2 |
| BUILD-001 | Static | N/A | CI/Local | TypeScript typecheck | Dependencies installed | `npm run typecheck` passes | Automated now | P0 |
| BUILD-002 | Startup | N/A | Web | App boots after new Expo deps | `expo-clipboard`, `expo-web-browser` installed | `npm run web` starts without dependency/runtime import errors | Manual interactive | P0 |
| DOC-001 | Docs | N/A | N/A | Setup docs match implementation | Read docs + app diagnostics | Callback URLs, routes, config names, dashboard paths are accurate | Manual review | P1 |

## Suggested Execution Order

1. `BUILD-001`
2. `AUTH-001` through `AUTH-007`
3. `SOC-012`, `SOC-013`, `SOC-015` (fast gating checks)
4. `SOC-001` through `SOC-011` (Google web/native interactive)
5. `DX-001` through `DX-005`
6. `AUTH-010`, `SOC-017` (generic-rest regression/contract checks)
7. `DOC-001`

## Telegram-Specific Notes (Current vs Future)

Current PMNative behavior expectation:

- `Telegram` is part of the provider contract/capability model
- `Telegram` runtime auth flow is not implemented yet in `supabase` provider
- tests should confirm graceful handling (`hidden` or typed `NOT_SUPPORTED`)

When Telegram is implemented later:

- reuse the same "social continue" semantics as Google/VK
- test both entry points (`Login`, `Register`)
- expect provider auth success to both create-and-sign-in (first time) or sign-in (repeat)

## Test Result Template (Use This When Executing)

For each test, record:

- `ID`
- `Date`
- `Platform` (web / ios / android)
- `Provider`
- `Result` (`PASS` / `FAIL` / `BLOCKED`)
- `Observed behavior`
- `Expected behavior`
- `Notes / screenshots / callback URL used`

## Where To Record Results

- `docs/NEXT_CHAT_HANDOFF.md` (summary / current status)
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md` (PMN-021-specific results and decisions)
