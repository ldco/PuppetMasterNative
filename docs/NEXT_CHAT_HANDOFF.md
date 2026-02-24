# PMNative Next Chat Handoff

Last updated: 2026-02-25
Status: PMNative is now in its own repo (`ldco/PuppetMasterNative`)

Planning note:
- Canonical current roadmap + immediate next-step list now lives in `docs/pmnative/ROADMAP.md`.
- This handoff file is for session history, implementation notes, and review findings.

## Session Update (2026-02-25, PMN-074 next phase started: revoke audit context contract)

### Current architecture decisions
- Extended session revoke mutation payloads to support structured audit context:
  - `context.source`
  - `context.action`
- Kept contracts explicit and forward-looking:
  - reason strings remain human/audit-oriented
  - context fields encode machine-readable action provenance
- Consolidated force-logout action metadata in service-level constants:
  - `ADMIN_SESSION_REVOKE_REASONS`
  - `ADMIN_SESSION_REVOKE_CONTEXTS`

### Completed work
- Provider contract updates:
  - added `AdminProviderSessionRevokeAuditContext`
  - added optional `auditContext` to revoke input types
  - provider now sends optional `body.context` with trimmed values
  - file: `src/services/admin.provider.types.ts`, `src/services/admin.provider.ts`
- Service contract updates:
  - added `AdminSessionRevokeAuditContext`
  - `adminService.revokeUserSessions(...)` and `adminService.revokeUserSession(...)` now normalize + pass `auditContext`
  - centralized reason/context constants
  - file: `src/services/admin.service.ts`
- Hook + UI wiring:
  - `useAdminUserSessions` now accepts optional `auditContext` in `revokeAll`/`revokeOne`
  - admin user-detail passes structured context for force-logout actions
  - file: `src/hooks/useAdminUserSessions.ts`, `src/app/(admin)/users/[id].tsx`
- Tests:
  - provider/service tests now assert reason + context trimming and passthrough
  - files:
    - `tests/services/admin.provider.test.ts`
    - `tests/services/admin.service.test.ts`
- Docs:
  - PMN-074 force-logout contract now documents optional `context` body shape
  - file: `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`70` tests)
- `npm test -- --run` passed (`116` tests total)

### Remaining tasks
- Decide whether PMN-074 should constrain `context.source` / `context.action` to enums at contract level or remain free-form strings.
- Consider exposing revoke reason/context controls in UI for master/admin policy workflows (currently deterministic constants only).

### Next phase goals
- Continue PMN-074 governance slice with typed reason/context taxonomy enforcement and provider capability details for audit-required endpoints.

## Session Update (2026-02-25, clean-architecture refactor pass: PMN-074 session metadata normalization)

### Current architecture decisions
- Treated admin session payload normalization as a first-class contract instead of a thin minimal shape:
  - session metadata now includes `expiresAt`, `deviceLabel`, and `platform` end-to-end.
- Removed UI-level hardcoded revoke-reason string duplication by centralizing reason constants in service contracts:
  - `ADMIN_SESSION_REVOKE_REASONS.FORCE_LOGOUT_ALL`
  - `ADMIN_SESSION_REVOKE_REASONS.FORCE_LOGOUT_ONE`
- Kept provider/service interfaces strict and explicit, preferring normalized fields over ad-hoc backend alias access in UI code.

### Issues identified
- Session normalization was too shallow for roadmap direction (`session expiry/device metadata`), forcing UI to rely on partial telemetry.
- Revoke reason strings were duplicated in screen code, increasing drift risk versus provider/service/docs.
- PMN-074 session contract docs were missing metadata alias details needed by backend implementers.

### Completed work
- Refactored session contracts:
  - `AdminProviderUserSession` + `AdminUserSession` now include:
    - `expiresAt`
    - `deviceLabel`
    - `platform`
  - Files:
    - `src/services/admin.provider.types.ts`
    - `src/services/admin.service.ts`
- Extended provider normalization:
  - accepts/normalizes alias fields:
    - `expiresAt` / `expires_at`
    - `deviceLabel` / `device_label` / `deviceName` / `device_name` / `device`
    - `platform`
  - Files:
    - `src/services/admin.provider.ts`
- Admin user-detail UI now renders normalized metadata and uses centralized reason constants.
  - File:
    - `src/app/(admin)/users/[id].tsx`
- Updated tests for richer session contracts and reason passthrough behavior:
  - `tests/services/admin.provider.test.ts`
  - `tests/services/admin.service.test.ts`
- Updated PMN-074 contract docs:
  - added session metadata alias map and force-logout reason body examples
  - File:
    - `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`70` tests)
- `npm test -- --run` passed (`116` tests total)

### Remaining tasks
- Continue PMN-074 governance scope with stricter session audit payload semantics (optional actor/context metadata for revoke actions if backend contract adopts it).
- Add hook-level coverage for `useAdminUserSessions` to validate reason passthrough + optimistic patch behavior at orchestration level.

### Next phase goals
- PMN-074 next contract slice: introduce explicit audit context fields for admin session revoke mutations (for example reason category / actor intent metadata), then wire provider tests first before UI adjustments.

## Session Update (2026-02-25, PMN-074 contract-first slice: force-logout reason metadata passthrough)

### Current status
- Continued roadmap target 3 with a contract-first PMN-074 admin sessions update focused on force-logout audit metadata (`reason`).
- Kept behavior backward-compatible: no reason still works, blank reason strings are omitted.

### Completed work
- Provider contracts:
  - extended revoke inputs with optional `reason`:
    - `AdminProviderRevokeUserSessionsInput.reason`
    - `AdminProviderRevokeUserSessionInput.reason`
  - `generic-rest` provider now sends `{ reason }` only when a non-empty trimmed value exists.
  - Files:
    - `src/services/admin.provider.types.ts`
    - `src/services/admin.provider.ts`
- Service contracts:
  - added optional `reason` passthrough with trimming in:
    - `adminService.revokeUserSessions(...)`
    - `adminService.revokeUserSession(...)`
  - Files:
    - `src/services/admin.service.ts`
- Hook + UI wiring:
  - `useAdminUserSessions` now accepts optional reason parameters for revoke actions.
  - Admin user-detail force-logout actions now send deterministic reasons:
    - `admin_user_detail_force_logout_all_sessions`
    - `admin_user_detail_force_logout_single_session`
  - Files:
    - `src/hooks/useAdminUserSessions.ts`
    - `src/app/(admin)/users/[id].tsx`
- Tests added:
  - provider tests for reason payload passthrough + trimming on both revoke endpoints
  - service tests for reason passthrough + trimming on both revoke methods
  - Files:
    - `tests/services/admin.provider.test.ts`
    - `tests/services/admin.service.test.ts`
- Docs updated:
  - added PMN-074 Admin User Sessions + Force Logout contract extension with optional `reason` body examples.
  - File:
    - `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`70` tests)
- `npm test -- --run` passed (`116` tests total)

### Open tasks
- Commit and push this PMN-074 reason-metadata contract batch.
- Continue next PMN-074 policy/governance contract slice (for example richer audit fields or session/device metadata normalization).

## Session Update (2026-02-25, roadmap continuation: PMN-074 export job traceability + PMN-071 contract test/docs expansion)

### Current status
- Continued implementation directly from roadmap targets after pushing `c1d3c72`.
- Added missing export-filter traceability in admin export job status UI and expanded PMN-071 settings-sync contract coverage/docs.

### Completed work
- `PMN-074` admin logs screen:
  - `Export job status` panel now includes the same filter summary shown in `Last export result`.
  - File: `src/app/(admin)/logs.tsx`
- `PMN-071` settings sync provider/service contract hardening (tests):
  - added Supabase `setSession` `403 -> UNAUTHORIZED` mapping test
  - added Supabase `updateUser` `500 -> PROVIDER` mapping test
  - added no-rotated-token (`session: null`) result behavior test
  - added preview test for `admin-module` warning row behavior when disabled
  - Files:
    - `tests/services/settingsSync.provider.test.ts`
    - `tests/services/settingsSync.service.test.ts`
- `PMN-071` docs expansion:
  - added explicit Supabase metadata contract section for settings sync (`pmnative_settings_sync`, `pmnative_settings_synced_at`) and error mapping.
  - File: `docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/settingsSync.provider.test.ts tests/services/settingsSync.service.test.ts` passed (`11` tests)
- `npm test -- --run` passed (`112` tests total)

### Open tasks
- Commit and push this roadmap-continuation batch.
- Continue next PMN-074 contract-first slice (policy/governance endpoints or force-logout reason metadata) per roadmap target 3.

## Session Update (2026-02-24, handoff refresh snapshot for PMN-074 export filters slice)

### Current status
- Branch: `master`
- Base commit: `c8415be` (`feat(admin): scaffold filtered log export requests`)
- Working tree is dirty and intentionally uncommitted for the active PMN-074 UI wiring slice.

### Uncommitted files
- `src/app/(admin)/logs.tsx`
- `src/hooks/useAdminLogs.ts`
- `docs/NEXT_CHAT_HANDOFF.md`

### What is in progress
- Admin logs export filters UI is wired (`query`, `levels`, `from`, `to`) and passed through `useAdminLogs.exportLogs(...)`.
- Client-side export date validation and retry-snapshot behavior are implemented.
- Last export result traceability now includes a filter summary.

### Validation state
- Last known green run (from the current slice before this refresh):
  - `npm run typecheck`
  - `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts`
  - `npm test -- --run`
- No additional commands were run during this handoff refresh step.

### Resume checklist for next chat
- Add focused hook/UI tests for export filter validation + retry-snapshot behavior.
- Decide whether timestamp validation should require UTC `Z` or allow any parseable ISO value.
- Commit and push the current PMN-074 export-filters UI batch when ready.

## Session Update (2026-02-24, PMN-074 export filters helper extraction + validation/snapshot tests)

### Current status
- Continued the in-progress admin logs export-filters slice by extracting filter logic into a pure helper module and adding focused unit coverage.
- Goal was to reduce regression risk around date validation + retry filter snapshots without introducing a new screen-test harness.

### Completed work
- Added `src/app/(admin)/logs.exportFilters.ts` with reusable export filter helpers:
  - `createEmptyExportFilterDraft`
  - `cloneExportFilterDraft`
  - `summarizeExportFilters`
  - `validateExportDateFilters`
  - related filter level/constants/types
- Refactored `src/app/(admin)/logs.tsx` to consume the helper module (no intended behavior change).
- Added tests: `tests/app/admin.logs.exportFilters.test.ts`:
  - summary generation
  - clone/snapshot isolation behavior for retry state safety
  - invalid from/to ISO validation errors
  - invalid date-range validation
  - valid/empty date acceptance

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/app/admin.logs.exportFilters.test.ts` passed (`6` tests)
- `npm test -- --run` passed (`106` tests total)

### Open tasks
- Decide whether to enforce stricter timestamp format semantics (for example UTC `Z` requirement) based on backend contract expectations.
- Add integration-style coverage for screen-level retry wiring (`ErrorState` retry restoring last requested filters) if UI harness scope is expanded later.
- Commit and push this combined PMN-074 filters UI + helper/test batch when ready.

## Session Update (2026-02-24, PMN-074 timestamp policy decision and implementation)

### Decision
- Final export date filter rule is now: **RFC3339 timestamp with explicit timezone only** (`Z` or `+/-HH:MM`), then normalize to UTC before request dispatch.
- Timezone-less timestamps are rejected client-side.

### Completed work
- Updated `src/app/(admin)/logs.exportFilters.ts` validation logic:
  - requires RFC3339 with timezone
  - normalizes valid `from`/`to` values via `toISOString()`
  - performs range check on normalized values
  - returns normalized values to callers
- Updated `src/app/(admin)/logs.tsx` export flow:
  - uses normalized `from`/`to` in `exportLogs(...)` requests
  - keeps retry/last-success snapshots aligned with normalized payload values
  - updates helper copy to document timezone requirement and UTC normalization
- Expanded tests in `tests/app/admin.logs.exportFilters.test.ts`:
  - timezone-less timestamps rejected
  - offset timestamps accepted and normalized to UTC
  - normalized values asserted across success/failure cases

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/app/admin.logs.exportFilters.test.ts` passed (`8` tests)
- `npm test -- --run` passed (`108` tests total)

### Open tasks
- Add integration-style screen/hook coverage for `ErrorState` retry path if we decide to introduce UI harness testing.
- Commit and push the current PMN-074 export-filters batch.

## Session Update (2026-02-24, PMN-074 admin log export filters UI wiring + validation + traceability)

### Current status
- Continued the post-push `PMN-074` richer export filters slice by wiring UI controls into Admin Logs and passing filter inputs through `useAdminLogs -> adminService.exportLogs`.
- Added client-side validation for export date filters and result traceability for the last successful export request.
- Work is currently uncommitted (screen + hook only).

### Completed work
- Extended `useAdminLogs.exportLogs(...)` to accept optional export filters (while keeping current callers backward-compatible):
  - `query`
  - `levels`
  - `from`
  - `to`
- Added admin logs export filter UI in `src/app/(admin)/logs.tsx`:
  - `Export Query` text input
  - `From` / `To` timestamp inputs (optional)
  - level toggle chips/buttons (`debug`, `info`, `warning`, `error`, `audit`)
  - `Clear export filters` action
  - active filter summary text
- Added client-side date filter validation before export:
  - ISO timestamp format check for `from` / `to`
  - range validation (`from <= to`)
  - inline field/range errors + warning toast when invalid
- Export retry behavior now reuses the last requested filter snapshot (not whatever is currently typed in the draft fields), so retry semantics remain deterministic.
- Added “last export request filter” traceability:
  - captures filter snapshot on successful export
  - shows `Filters: ...` (or `Filters: none`) in the `Last export result` panel

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`66` tests)
- `npm test -- --run` passed (`100` tests)

### Open tasks
- Decide whether to validate timestamp strings more strictly (UTC `Z` only vs any ISO parseable value) based on backend contract expectations.
- Consider surfacing the same filter traceability in the export job-status panel (not just `Last export result`) if polling can span long sessions.
- Add hook/UI tests for export filter validation and retry-snapshot behavior (currently manually reviewed + typechecked).
- Commit and push this UI wiring/validation batch when ready.

### Recommended next steps
- Keep the current slice focused and add lightweight docs/hints for accepted timestamp format in admin export filters (or backend-specific examples).
- If backend supports it, extend export result/job metadata to echo normalized filters so the client can display authoritative server-side applied filters.

## Session Update (2026-02-24, review/hardening pass for PMN-074 admin log export + job-status slice)

### Current status
- Reviewed the newly added admin logs export/job-status code path end-to-end (`logs.tsx`, `useAdminLogs`, `admin.provider`, `admin.service`, config/validation wiring, and service/provider tests).
- Applied safe fixes for state consistency, capability reporting, and input validation.
- Validation is green after fixes (`typecheck` + targeted provider/service tests).

### Scope of analysis
- UI workflow gating and state transitions in `src/app/(admin)/logs.tsx`
- Hook orchestration/race behavior in `src/hooks/useAdminLogs.ts`
- Provider normalization/capability details in `src/services/admin.provider.ts`
- Service capability/input guards in `src/services/admin.service.ts`
- Regression coverage in:
  - `tests/services/admin.provider.test.ts`
  - `tests/services/admin.service.test.ts`

### Issues discovered
- Stale export job-status panel could remain visible after starting a new export, causing the UI to show a previous job result next to a newer export request.
- CSV export action row was not disabled while export-status polling (`isCheckingExportJob`) was in flight, unlike the JSON export row (gating inconsistency).
- `generic-rest` capability reporting marked `getLogExportJob` as supported when the configured endpoint string existed but was missing the required `:jobId` placeholder, leading to a misleading enabled UI and later runtime config error.
- `adminService.getLogExportJob(...)` accepted whitespace-only `jobId` values and would forward them to the provider without validation.

### Fixes implemented
- `useAdminLogs.exportLogs(...)` now clears `lastExportJob` when a new export starts to prevent stale status UI carryover.
- `src/app/(admin)/logs.tsx` CSV export action now disables while `isCheckingExportJob` is active (matches JSON action behavior).
- `admin.provider` capability logic for `getLogExportJob` now requires a `:jobId` placeholder and reports a specific misconfiguration detail message when missing.
- `adminService.getLogExportJob(...)` now trims `jobId` and rejects blank values before provider calls.
- Added regression tests for:
  - invalid `getLogExportJob` endpoint template capability reporting
  - `getLogExportJob` `jobId` trimming and blank-id rejection

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`65` tests)

### Open tasks / remaining risks
- No dedicated UI/hook tests currently cover the admin logs export polling workflow, so state regressions in `useAdminLogs` / `logs.tsx` are still primarily protected by manual review and type checks.
- Export polling remains manual; if auto-polling is added later, request cancellation/debounce behavior should be revisited in `useAdminLogs`.
- `src/services/admin.provider.ts` continues to grow; additional PMN-074 slices should prefer internal helper extraction to reduce regression surface.

### Recommended next steps
- Continue `PMN-074` with the next admin export/policy workflow slice (recommended: richer export filters contract support, provider/service-first, tests first).
- Add focused hook/UI tests for `useAdminLogs` export + job-status orchestration if the workflow continues to expand.

## Session Update (2026-02-24, post-push next phase start: PMN-074 richer admin log export filters contract groundwork)

### Current status
- Began the next `PMN-074` admin export workflow phase immediately after pushing `ffbfe8d`.
- Implemented provider/service contract groundwork for richer export filters (no admin logs UI wiring yet).

### Completed work
- Extended export request contracts with optional filter fields:
  - `query`
  - `levels`
  - `from`
  - `to`
- Added service-level normalization/passthrough in `adminService.exportLogs(...)`:
  - trims string filters
  - de-duplicates `levels`
- Added provider request-body support in `adminProvider.exportLogs(...)`:
  - sends optional filters only when non-empty
  - trims string values and de-duplicates `levels`
- Added regression tests:
  - provider request body includes optional export filters
  - service export passthrough normalizes filter inputs before provider call

### Validation
- `npm run typecheck` passed
- `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`66` tests)

### Open tasks
- Wire filter inputs into `src/hooks/useAdminLogs.ts` and `src/app/(admin)/logs.tsx` (UX for query/date range/level selection is not started).
- Align backend contract docs/examples for expected filter semantics (timestamp format, inclusive bounds, level names).
- Decide whether to persist export filter selections in UI state and surface them in `lastExport` metadata.

### Recommended next steps
- Continue the same slice by adding capability-safe UI controls for export filters in admin logs, keeping the current manual job-status polling flow.
- If UI scope is deferred, document the filter contract in roadmap/handoff and hold the provider/service scaffolding as backend-first groundwork.

## Session Update (2026-02-23, PMN-074 admin log export job-status polling)

### Current architecture decisions
- Kept export submission (`exportLogs`) and export job polling (`getLogExportJob`) as separate provider/service contracts to avoid overloading one endpoint method with two responsibilities.
- Extended the existing `useAdminLogs` workflow hook instead of adding a new export-specific screen hook, because polling state belongs to the same admin logs workflow surface as list/clear/export/audit actions.

### Completed work
- Added config/validation/example support for `generic-rest` export job-status endpoint:
  - `backend.genericRest.admin.endpoints.getLogExportJob` (`:jobId` template)
- Extended admin provider capabilities/contracts:
  - `canGetLogExportJobRemote`
  - `getLogExportJobDetail`
  - `getLogExportJob({ accessToken, jobId })`
- Implemented `generic-rest` provider job-status path:
  - `GET` to `getLogExportJob`
  - payload normalization supports raw / `{ export }` / `{ success: true, data }`
  - status alias normalization (`pending|processing|completed|failed` -> `queued|running|ready|error`)
  - response maps `url/downloadUrl/download_url`, `jobId/job_id`, `message/error`
  - `401/403 -> UNAUTHORIZED` via shared admin error mapper
- Added admin service method:
  - `adminService.getLogExportJob(...)` (capability-gated)
- Extended `useAdminLogs` export workflow state:
  - `isCheckingExportJob`
  - `exportJobError`
  - `lastExportJob`
  - `checkExportJob(...)`
  - export-job error reset helper
  - concurrency gating across refresh/clear/export/row log mutations while status checks run
- Updated `src/app/(admin)/logs.tsx`:
  - capability-gated `Check export job status` action
  - status retry/error handling
  - export job status result panel (`queued/running/ready/error`) + open URL action when available
  - loading overlay includes export-status polling state
- Tests added:
  - `tests/services/admin.provider.test.ts` (`getLogExportJob` normalization + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (`getLogExportJob` success + `NOT_SUPPORTED`)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`63` tests)

### Remaining tasks
- Decide whether export status polling should auto-refresh on an interval (current UI is manual polling by design).
- If backend supports richer export filters (date range/level/query), expand export contract inputs and preserve them in export job metadata/result UI.
- Consider extracting admin logs export/audit orchestration helpers from `useAdminLogs` if that hook grows further.

### Next phase goals
- Continue `PMN-074` with broader admin policy/export workflows (filterable exports, audit metadata/reasons, or export governance endpoints) using the same provider/service-first pattern.

## Session Update (2026-02-23, PMN-074 admin logs export UI wiring)

### Current architecture decisions
- Finished the `admin logs export` slice by wiring UI on top of the already-implemented provider/service contract instead of inventing a separate screen, keeping log actions (list/clear/export/audit mutations) in one workflow surface.
- Added export workflow state to `useAdminLogs` (`isExporting`, `exportError`, `lastExport`) so async export behavior is owned by the hook and not fragmented across the screen.

### Completed work
- Extended `useAdminLogs` with export orchestration:
  - `exportLogs(format?)`
  - `isExporting`
  - `exportError`
  - `lastExport`
  - export-specific error reset helper
- Tightened log-action concurrency gating:
  - `refresh`, `clear`, and row log mutations now also block while export is in flight
  - export blocks while refresh/clear/row mutations are active
- Wired `src/app/(admin)/logs.tsx` export UI:
  - capability-gated `Export logs (JSON)` and `Export logs (CSV)` actions
  - export error state with retry
  - last export result panel (supports direct download URL or async `jobId`)
  - `Open export URL` action via external URL open
  - loading overlay now reflects export activity
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`93` tests)

### Remaining tasks
- If backend export endpoints are asynchronous jobs, define and implement export job-status polling/refresh contract (or explicitly defer as a separate admin exports phase).
- Decide whether export should support richer filters (level/date range/query) instead of current `limit + format` only.
- Consider extracting admin logs hook mutation/export orchestration helpers if the logs workflow grows further.

### Next phase goals
- Continue `PMN-074` with broader admin policy/export workflows (reasons/audit metadata, richer export semantics, or additional admin actions) using the same provider/service-first pattern.

## Session Update (2026-02-23, post-push next phase start: PMN-074 admin logs export contract slice)

### Current architecture decisions
- Started the next admin workflow family continuation with provider/service-first contract work (`export logs`) before UI wiring, to keep backend contract validation/test coverage ahead of screen complexity.
- Reused existing admin logs patterns (`clearLogs` mutation contract shape + provider error mapping) but defined a separate export result contract (`url` / `jobId` / `format`) instead of overloading clear/audit mutation paths.

### Completed work
- Added config/validation/example support for `generic-rest` admin logs export endpoint:
  - `backend.genericRest.admin.endpoints.exportLogs`
- Extended admin provider capabilities/contracts:
  - `canExportLogsRemote`
  - `exportLogsDetail`
  - `exportLogs({ accessToken, format?, limit? })`
- Implemented `generic-rest` `exportLogs` provider path:
  - `POST` body supports `format` (`json`/`csv`) and optional `limit`
  - response normalization supports alias fields (`url` / `downloadUrl` / `download_url`, `jobId` / `job_id`)
  - preserves normalized `format`
  - maps `401/403 -> UNAUTHORIZED` via shared admin request mapper
- Added service contract/method:
  - `adminService.exportLogs(...)`
  - capability-gated, returns provider source detail and normalized export metadata
- Added tests:
  - `tests/services/admin.provider.test.ts` (`exportLogs` success normalization + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (`exportLogs` success + `NOT_SUPPORTED`)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`59` tests)
  - `npm test -- --run` passed (`93` tests)

### Remaining tasks
- Wire `exportLogs` into `src/app/(admin)/logs.tsx` (format choice, action UX, and result handling for direct download URL vs async jobId).
- Decide whether export should be one action (`default json`) or explicit format actions (`Export JSON` / `Export CSV`) in admin logs UI.
- If backend returns long-running jobs, define polling/fetch job-status contract or leave as follow-up admin exports slice.

### Next phase goals
- Add capability-gated admin logs export UI wiring in `/(admin)/logs` using the new provider/service contract, then continue broader admin policy/export workflows.

## Session Update (2026-02-23, PMN-074 cleanup pass: admin mutation concurrency + optimistic state hardening)

### Current architecture decisions
- Kept feature scope unchanged, but tightened client mutation orchestration inside hooks rather than adding more UI-only guard code.
- Preferred explicit local mutation helpers in hooks (`useAdminLogs`, `useAdminUserSessions`) over duplicating optimistic patch logic in screens.

### Completed work
- Fixed admin logs concurrency bug in `src/hooks/useAdminLogs.ts` / `src/app/(admin)/logs.tsx`:
  - `refresh()` / `clear()` now block while row log mutations (`acknowledge/resolve/retry`) are in flight
  - clear action UI is disabled during row mutations
  - busy toasts now show action-specific messages instead of incorrectly reusing provider capability detail strings
- Refactored `useAdminUserSessions` optimistic updates for correctness:
  - extracted local helpers for applying list results and revoke patches
  - `revokeAll` no longer leaves `current` target-user session unmodified (previously wrong assumption)
  - `revokeAll` / `revokeOne` no longer force `revoked: true` when backend result indicates no revoked sessions (`revokedCount === 0`) or lacks actionable payload
  - sessions refresh now blocks while any session mutation is running (`revoke all` or `revoke one`)
- Hardened Admin User Detail sessions UX:
  - per-session revoke now also disables on self-target (consistent with existing force-logout self-guard)
  - row action busy gating is aligned with other user-detail mutations (role/status/lock)
- Validation after cleanup pass:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`89` tests)

### Remaining tasks
- `src/services/admin.provider.ts` is now a large provider monolith; future admin slices should start extracting endpoint-template/request helper clusters (logs, sessions, users) into smaller internal modules if the file keeps growing.
- Decide whether sessions UI should suppress single-session revoke for `session.current === true` on non-self targets, or leave fully backend-policy-driven (current behavior allows it for admins).
- Commit and push the consolidated `PMN-074` admin batch (features + cleanup hardening) when ready.

### Next phase goals
- Start the next admin workflow family (`PMN-074`) beyond sessions/logs, ideally with provider/service-first contract work for exports or policy actions.

### Current architecture decisions
- Added user-sessions orchestration as a separate hook (`useAdminUserSessions`) instead of expanding `useAdminUser`, keeping user-detail identity/role-status-lock mutations separate from sessions list/revoke workflow state.
- Kept the same provider/service-first pattern used across `PMN-074`, with capability-gated UI actions and config-driven `generic-rest` endpoints.

### Completed work
- Added config/validation/example contract support for `generic-rest` user sessions endpoints:
  - `backend.genericRest.admin.endpoints.listUserSessions`
  - `backend.genericRest.admin.endpoints.revokeUserSessions`
  - `backend.genericRest.admin.endpoints.revokeUserSession`
- Extended admin provider capabilities/contracts:
  - `canListUserSessionsRemote`
  - `canRevokeUserSessionsRemote`
  - `canRevokeUserSessionRemote`
  - `listUserSessionsDetail`
  - `revokeUserSessionsDetail`
  - `revokeUserSessionDetail`
  - `listUserSessions({ accessToken, userId })`
  - `revokeUserSessions({ accessToken, userId })`
  - `revokeUserSession({ accessToken, userId, sessionId })`
- Implemented `generic-rest` provider user sessions workflow:
  - sessions payload normalization (aliases like `created_at`, `last_seen_at`, `ip`, `user_agent`, `isCurrent`, `isRevoked`)
  - revoke-all sessions mutation payload normalization (`revokedCount` / `count`)
  - per-session revoke mutation normalization (supports updated-session payload or count payload fallback)
  - provider error mapping (`401/403 -> UNAUTHORIZED`)
- Added admin service support:
  - `adminService.getUserSessions(...)` / `refreshUserSessions(...)` with local fallback (`[]`) on unsupported/config/auth errors
  - `adminService.revokeUserSessions(...)` capability-gated force-logout mutation
  - `adminService.revokeUserSession(...)` capability-gated single-session revoke mutation
- Added new hook:
  - `src/hooks/useAdminUserSessions.ts` (sessions list + refresh + revoke-all + row-level single-session revoke state)
- Updated `src/app/(admin)/users/[id].tsx`:
  - sessions section in Admin User Detail
  - provider capability messaging
  - sessions list preview (up to 5 items)
  - `Refresh sessions` action
  - destructive `Force logout` action (confirmation-gated)
  - per-session `Revoke session` action (confirmation-gated, row-level error state)
  - loading overlay now reflects sessions refresh/revoke operations
- Tests added/expanded:
  - `tests/services/admin.provider.test.ts` (list/revoke-all/revoke-single user sessions success + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (sessions fallback/remote + revoke-all/revoke-single success + `NOT_SUPPORTED`)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`55` tests)
  - `npm test -- --run` passed (`89` tests)

### Remaining tasks
- If backend supports it, expose richer session metadata in UI (device label, geo, revoke actor/reason, session expiry).
- Decide whether per-session revoke should be blocked for `current` target session in client UX or left fully backend-policy-driven (current implementation is backend-policy-driven).
- Commit the current admin batch (confirmations + logs audit actions + user sessions/force-logout + prior PMN-074 slices) when ready.

### Next phase goals
- Continue `PMN-074` with a different admin workflow family (policy actions / exports / audit exports) using the same provider/service-first pattern.

## Session Update (2026-02-23, PMN-074 per-log audit mutations slice (acknowledge/resolve/retry))

### Current architecture decisions
- Continued the admin logs actions pattern with provider/service-first contracts and capability-gated UI actions.
- Refactored `useAdminLogs` row mutations around a shared `runLogMutation(...)` path so new per-log actions (`acknowledge`, `resolve`, `retry`) do not duplicate async/error/state handling.
- Kept log-entry normalization explicit in `adminProvider` (`normalizeAdminLog`) so alias mapping (`acked`, `acknowledged_at`, `isResolved`, `resolved_at`) works even in mocked tests that bypass schema transforms.

### Completed work
- Added config/validation/example contract support for `generic-rest` per-log audit action endpoints:
  - `canAcknowledgeLogRemote`
  - `canResolveLogRemote`
  - `canRetryLogRemote`
  - `acknowledgeLogDetail`
  - `resolveLogDetail`
  - `retryLogDetail`
  - `acknowledgeLog({ accessToken, logId })`
  - `resolveLog({ accessToken, logId })`
  - `retryLog({ accessToken, logId })`
- Implemented `generic-rest` provider per-log audit mutations (`POST` to `:id` endpoint templates) with single-log payload normalization and admin error mapping.
- Added service methods (capability-gated, provider-source detail preserved):
  - `adminService.acknowledgeLog(...)`
  - `adminService.resolveLog(...)`
  - `adminService.retryLog(...)`
- Extended `useAdminLogs()` with row-level audit mutation orchestration:
  - `logMutations[logId]`
  - `acknowledge(logId)`
  - `resolve(logId)`
  - `retry(logId)`
  - `clearLogMutationError(logId)`
- Updated `src/app/(admin)/logs.tsx`:
  - per-row `Acknowledge` / `Resolve` / `Retry` actions (capability-gated)
  - row-level mutation error state (shared across log actions)
  - `ack/new` and `resolved/open` badges
  - loading overlay reflects any in-flight row log mutation (`Updating logs...`)
- Tests added/expanded:
  - `tests/services/admin.provider.test.ts` (`acknowledge`, `resolve`, `retry` success/error coverage)
  - `tests/services/admin.service.test.ts` (`acknowledge`, `resolve`, `retry` success + `NOT_SUPPORTED`)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`46` tests)
  - `npm test -- --run` passed (`80` tests)

### Remaining tasks
- Decide whether per-log actions should expose actor metadata / reason fields in UI when backend returns them (currently UI tracks booleans/timestamps only).
- Consider splitting `useAdminLogs` row mutation status into a reusable internal helper if future per-log actions add additional payload-specific state (the current shared mutation runner is sufficient for now).
- Commit the current admin batch (confirmations + acknowledge log + prior PMN-074 slices) when ready.

### Next phase goals
- Move beyond logs actions to the next `PMN-074` admin workflow slice (for example sessions/force-logout or export/audit endpoints) using the same provider/service-first pattern.

## Session Update (2026-02-23, post-push next phase: destructive-action confirmations)

### Current architecture decisions
- Reused the existing app-level `useConfirm()` / `ConfirmDialog` infrastructure for admin guardrails instead of introducing screen-local `Alert` calls or a parallel confirmation mechanism.
- Confirmations are applied directly at action callsites in admin screens (no wrapper/adaptor layer), keeping control flow explicit and avoiding compatibility abstractions.

### Completed work
- Added confirmation prompts for destructive admin actions:
  - `src/app/(admin)/logs.tsx`: confirm before `Clear remote logs`
  - `src/app/(admin)/users.tsx`: confirm before inline `Disable` / `Lock`
  - `src/app/(admin)/users/[id].tsx`: confirm before detail-screen `Disable user` / `Lock user`
- Confirmations use destructive tone and context-specific messages (user name/email or destructive log warning).
- Validation after post-push continuation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`70` tests)

### Remaining tasks
- Continue `PMN-074` per-log audit/log mutations (acknowledge/resolve/retry) when backend contract is defined.
- Consider expanding confirmations to any future destructive admin actions (e.g., per-log delete, force logout) as they are added.

### Next phase goals
- Start provider/service-first per-log audit mutation contract (or equivalent backend-supported log action mutation) and wire capability-gated UI actions in `/(admin)/logs`.

## Session Update (2026-02-23, admin hooks architecture refactor + PMN-074 continuation cleanup)

### Current architecture decisions
- Backward-compatibility was intentionally not prioritized for admin hooks in this refactor pass:
  - the monolithic `useAdmin()` hook was replaced by focused hooks:
    - `useAdminSections()`
    - `useAdminUsers()`
    - `useAdminRoles()`
- Rationale:
  - previous `useAdmin()` mixed section resolution, users list fetch, roles list fetch, and row-level mutations in one hook, creating unnecessary coupling and making admin screens re-render around unrelated state.
  - focused hooks align screen ownership with data ownership and reduce future mutation complexity.
- `useAdminUsers()` now owns inline users-list mutation state (`status` / `lock`) and list patching, while `useAdminUser()` remains the detail-screen orchestration hook.

### Completed work
- Refactored `src/hooks/useAdmin.ts` into focused hooks (`useAdminSections`, `useAdminUsers`, `useAdminRoles`) with clearer single responsibilities.
- Updated admin screens to use focused hooks directly:
  - `src/app/(admin)/index.tsx`
  - `src/app/(admin)/users.tsx`
  - `src/app/(admin)/roles.tsx`
- Improved mutation lifecycle handling in `useAdminUsers()`:
  - row-level mutation state stored in one place
  - mounted guards for async status/lock mutations to avoid state updates after unmount
- Preserved current provider/service contracts and UI behavior while simplifying hook architecture (no compatibility wrapper layer added).
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`70` tests)

### Remaining tasks
- Add confirmation guardrails for destructive/high-impact admin actions:
  - disable/lock user (list + detail)
  - clear logs
- Continue `PMN-074` deeper admin actions (per-log audit mutations) once backend contract is available.

### Next phase goals
- Add confirmation UX for destructive admin mutations (no adapter layer; direct screen-level integration or shared confirm primitive if introduced cleanly).
- Then continue provider/service-first `PMN-074` audit/log mutation contract work.

## Session Update (2026-02-23, PMN-074 users-list inline status/lock controls)

### Current status
- Continued `PMN-074` with admin users-list ops UX polish: inline status/lock controls are now available directly in `/(admin)/users` without navigating into user detail.
- The new list-level actions reuse existing provider/service mutations (`updateUserStatus`, `updateUserLock`) and are orchestrated through expanded `useAdmin()` per-row mutation state.
- Working tree remains uncommitted (continuation after pushed `378856c`), and local validation is green.

### Completed work
- Extended `useAdmin()` with per-row user mutation orchestration:
  - `userMutations[userId]` (`isUpdatingStatus`, `isUpdatingLock`, `error`)
  - `updateUserStatus(userId, disabled)`
  - `updateUserLock(userId, locked)`
  - `clearUserMutationError(userId)`
  - local users-list row patching after successful mutations
  - users source/sourceDetail updated from mutation results
- Updated `src/app/(admin)/users.tsx`:
  - inline `Enable` / `Disable` / `Unlock` / `Lock` buttons per user row
  - row badges now surface status (`active`/`disabled`) and lock state
  - row-level mutation error caption
  - self-target restrictions remain enforced in list actions
  - shared loading overlay now reflects inline mutation activity (`Updating users...`)
- Preserved detail-screen admin flows (`/(admin)/users/[id]`) while making common ops faster from the list.
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`70` tests)

### Open tasks
- Add confirmation UX for destructive/high-impact list actions (especially `Disable`, `Lock`) to reduce misclick risk.
- Continue `PMN-074` with per-log audit mutations (acknowledge/resolve/retry) if backend contract is ready.
- Consider admin hook tests for `useAdmin()` if inline ops logic keeps expanding.

### Recommended next step
- Implement per-log audit mutation contract (provider/service-first) and add confirmation/guardrails in admin logs/users screens.

### Remaining risks / TODO
- Inline list actions currently optimize speed over confirmation safety; backend policy enforcement still protects unauthorized actions, but client-side confirmations would reduce operator mistakes.
- `useAdmin()` now owns more mutation orchestration state; if more list-level actions are added, extract shared row-mutation helpers to keep the hook maintainable.

## Session Update (2026-02-23, PMN-074 admin clear-logs mutation slice)

### Current status
- Continued `PMN-074` by adding the first provider-backed logs mutation (`clear logs`) on top of the previously added admin logs list screen.
- `generic-rest` clear-logs support is now config-gated via `backend.genericRest.admin.endpoints.clearLogs`, with provider/service support, `useAdminLogs` mutation state, and a capability-gated clear action in `/(admin)/logs`.
- Working tree remains uncommitted (continuation after pushed `378856c`), and current validation is green.

### Completed work
- Extended config contract + validation for `generic-rest` admin clear-logs endpoint:
  - `backend.genericRest.admin.endpoints.clearLogs`
- Extended admin provider capabilities/contracts:
  - `canClearLogsRemote`
  - `clearLogsDetail`
  - `clearLogs(...)`
  - `AdminProviderClearLogsResult`
- Implemented `generic-rest` clear-logs provider path in `src/services/admin.provider.ts`:
  - `POST` to `clearLogs` endpoint
  - response normalization for `{ count }` / `{ clearedCount }` / nested `{ success: true, data }`
  - unauthorized/provider error mapping via existing admin request mapper
- Added admin service mutation wrapper:
  - `adminService.clearLogs(...)`
  - capability-gated `NOT_SUPPORTED` handling
- Extended `useAdminLogs()`:
  - `clear()`
  - `isClearing`
  - `clearError`
  - busy gating against simultaneous refresh/clear
  - local list reset after successful clear
- Updated `src/app/(admin)/logs.tsx`:
  - capability-gated `Clear remote logs` action row
  - clear error display + retry path
  - loading overlay now covers clear mutation state
- Expanded tests:
  - `tests/services/admin.provider.test.ts` (`clearLogs` success + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (`clearLogs` success + `NOT_SUPPORTED`)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`70` tests)

### Open tasks
- Continue `PMN-074` with richer log/audit mutations (per-log acknowledge/retry/resolve) if backend contract is available.
- Or implement list-level status/lock controls in `/(admin)/users` as ops UX polish using the existing provider/service mutations.
- Consider adding a confirmation step for destructive log clearing if this becomes part of regular admin workflows.

### Recommended next step
- Choose one next `PMN-074` chunk:
  1. per-log audit mutation contract (acknowledge/resolve), or
  2. list-level status/lock controls with per-row mutation state + confirmations.

### Remaining risks / TODO
- `clearLogs` is intentionally broad/destructive; backend contracts may require filters or scope limits (e.g. age/level/source) before production use.
- Current logs mutation path is generic-rest-first; `supabase` admin provider remains a stub.

## Session Update (2026-02-23, PMN-074 user lock/unlock mutation slice)

### Current status
- Continued `PMN-074` with a provider-backed user lock/unlock mutation slice after landing admin logs and admin settings snapshot slices.
- `generic-rest` user lock support is now config-gated via `backend.genericRest.admin.endpoints.updateUserLock`, with provider/service support, `useAdminUser` mutation state handling, and capability-gated lock/unlock actions in admin user detail.
- Working tree remains uncommitted (continuation after pushed `378856c`), and current validation is green.

### Completed work
- Extended config contract + validation for `generic-rest` admin lock mutation endpoint:
  - `backend.genericRest.admin.endpoints.updateUserLock`
- Extended admin provider capabilities/contracts:
  - `canUpdateUserLockRemote`
  - `updateUserLockDetail`
  - `updateUserLock({ userId, locked })`
  - admin user model supports optional lock fields (`locked`, `lockedUntil`)
- Hardened admin user normalization in `src/services/admin.provider.ts`:
  - explicit `normalizeAdminUser(...)` used for user/list payloads
  - alias support for `isLocked` / `locked_until`
  - keeps backward-compatible optional-field shape (no extra undefined fields emitted)
- Implemented `generic-rest` provider path:
  - `PATCH` to `updateUserLock` endpoint template with `:id`
  - request body `{ locked }`
  - existing admin request error mapping (`401/403 -> UNAUTHORIZED`)
- Added admin service mutation wrapper:
  - `adminService.updateUserLock(...)`
  - capability-gated `NOT_SUPPORTED` handling
- Extended `useAdminUser()`:
  - `updateLock(...)`
  - `isUpdatingLock`
  - `lockUpdateError`
  - cross-mutation busy gating (role/status/lock)
- Updated `src/app/(admin)/users/[id].tsx`:
  - lock badge (`locked` / `unlocked` / `lock unknown`)
  - optional `Locked until` display
  - capability-gated `Lock user` / `Unlock user` actions
  - loading overlay now covers lock mutations
- Expanded tests:
  - `tests/services/admin.provider.test.ts` (`updateUserLock` success + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (`updateUserLock` success + `NOT_SUPPORTED`)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`66` tests)

### Open tasks
- Continue `PMN-074` with audit/log mutations or richer admin ops UX (inline list-level status/lock controls) depending backend priorities.
- Decide whether lock contract should support lock reason / expiry in mutation input (current normalized request is `{ locked: boolean }` only).
- Consider admin hook tests if `useAdminUser` mutation orchestration grows further.

### Recommended next step
- Implement the next `PMN-074` mutation slice for audit/log actions (e.g. acknowledge/retry/clear) or, if backend scope is not ready, add list-level status/lock controls with per-row mutation state and confirmations.

### Remaining risks / TODO
- Current lock mutation request shape is intentionally minimal (`{ locked: boolean }`); if backend requires `lockedUntil`/reason payloads, document and map explicitly before wider adoption.
- `supabase` admin provider remains a stub, so advanced admin mutations continue to be generic-rest-first.

## Session Update (2026-02-23, PMN-074 admin settings endpoint slice)

### Current status
- Continued `PMN-074` with a provider-backed admin settings snapshot slice integrated into the existing `/(admin)/settings` screen (which already hosts PMN-071 settings-sync controls).
- `generic-rest` admin settings support is now config-gated via `backend.genericRest.admin.endpoints.settings`, with provider normalization, service config fallback, a dedicated hook, and service/provider tests.
- Working tree remains uncommitted (continuation after pushed `378856c`), but current validation is green.

### Completed work
- Extended config contract + validation for `generic-rest` admin settings endpoint:
  - `backend.genericRest.admin.endpoints.settings`
- Extended admin provider capabilities/contracts:
  - `canGetSettingsRemote`
  - `getSettingsDetail`
  - `getSettings(...)`
  - `AdminProviderSettingsSnapshot` / setting item/value types
- Implemented `generic-rest` admin settings provider path in `src/services/admin.provider.ts`:
  - payload normalization for array / `{ settings }` / `{ success: true, data }`
  - alias normalization (`updated_at`, `section -> group`)
  - unauthorized/provider error mapping through existing admin request mapper
- Added admin service settings snapshot path in `src/services/admin.service.ts`:
  - `getSettings()` / `refreshSettings()`
  - config fallback snapshot (features + backend provider/api base URL) when unsupported/config/auth-gated
- Added `src/hooks/useAdminSettingsSnapshot.ts`
- Integrated backend admin settings snapshot UI into `src/app/(admin)/settings.tsx`:
  - remote/fallback badge + source detail
  - refresh action
  - snapshot list rendering with group badges
  - loading/error/refresh states while preserving existing settings-sync bottom-sheet flow
- Expanded tests:
  - `tests/services/admin.provider.test.ts` (`getSettings` normalization + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (`getSettings` remote + config fallback behavior)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`62` tests)

### Open tasks
- Continue `PMN-074` with user lock / account lockout action endpoints (provider/service-first pattern) and capability-gated admin UI actions.
- Decide whether admin settings snapshot should gain mutation support (`PATCH`/`PUT`) in a later slice or remain read-only diagnostics for now.
- Consider provider-side pagination/filter contract for logs and stricter response docs for settings/logs as backend implementations converge.

### Recommended next step
- Implement `PMN-074` user lock/lockout mutation slice (provider/service-first + admin user-detail UI + tests), then revisit inline list-level status/lock controls as ops UX polish.

### Remaining risks / TODO
- Admin settings snapshot fallback currently exposes local `api.baseUrl` and feature flags for diagnostics; if this screen is used outside trusted admin contexts, consider redaction policy.
- `supabase` admin provider remains a stub, so advanced admin endpoints (settings/logs/health/status) stay generic-rest-first for now.

## Session Update (2026-02-23, PMN-074 admin logs endpoint slice)

### Current status
- Continued `PMN-074` with a full provider/service-first `logs` endpoint slice after landing the admin `health` slice.
- `generic-rest` admin logs support is now config-gated via `backend.genericRest.admin.endpoints.listLogs`, with provider normalization, service fallback behavior, a new admin hook/screen, and tests.
- Working tree remains uncommitted (continuation after pushed `378856c`), but local validation is green.

### Completed work
- Extended config contract + validation for `generic-rest` admin logs endpoint:
  - `backend.genericRest.admin.endpoints.listLogs`
- Extended admin provider capabilities/contracts:
  - `canListLogsRemote`
  - `listLogsDetail`
  - `listLogs({ accessToken, limit? })`
  - `AdminProviderLogEntry` / `AdminProviderLogLevel`
- Implemented `generic-rest` logs provider path in `src/services/admin.provider.ts`:
  - payload normalization for array / `{ logs }` / `{ success: true, data }`
  - alias normalization (`created_at` / `createdAt` -> `timestamp`, `service|category` -> `source`)
  - level normalization (`warn -> warning`, `fatal -> error`, `trace -> debug`)
  - optional `limit` query support (`?limit=...`)
  - unauthorized/provider error mapping via existing admin request error mapper
- Added admin service logs path in `src/services/admin.service.ts`:
  - `getLogs()` / `refreshLogs()`
  - local fallback (empty logs) for unsupported/config/auth-gated cases
- Added UI for logs:
  - `src/hooks/useAdminLogs.ts`
  - `src/app/(admin)/logs.tsx`
  - `src/app/(admin)/index.tsx` route mapping to `./logs`
  - local search/filter and refresh flow
- Expanded tests:
  - `tests/services/admin.provider.test.ts` (`listLogs` normalization + query + unauthorized mapping)
  - `tests/services/admin.service.test.ts` (`getLogs` remote + fallback behavior)
- Validation:
  - `npm run typecheck` passed
  - `npm test -- --run tests/services/admin.provider.test.ts tests/services/admin.service.test.ts` passed (`24` tests)
  - `npm test -- --run` passed (`58` tests)

### Open tasks
- Continue `PMN-074` with next provider-backed endpoint slice (`settings` or user lock actions recommended next).
- Decide whether to add provider-level filtering params beyond `limit` for logs (e.g. level/search cursor) and document contract if adopted.
- Consider admin hook/UI tests as admin screens continue to grow (current coverage remains provider/service-focused).

### Recommended next step
- Implement `PMN-074` admin settings endpoint slice (provider/service-first + capability/detail + screen wiring/tests), then continue with user lock actions.

### Remaining risks / TODO
- `logs` payload normalization is intentionally permissive for early backend alignment; formalize a stricter backend contract if multiple backend teams start implementing it.
- `supabase` admin provider remains a stub, so admin logs/health/status/roles advanced endpoints stay generic-rest-first for now.

## Session Update (2026-02-23, PMN-074 admin health endpoint slice + status-slice validation closeout)

### Current status
- `PMN-074` admin user status/disable slice is now fully wired through provider/service/hook/UI with hardening coverage (`47` -> `49` tests previously during the slice), and the next admin endpoint slice (`health`) is now implemented provider-first and exposed via a new admin route/screen.
- `generic-rest` admin health endpoint support (`backend.genericRest.admin.endpoints.health`) is config-gated and returns a normalized health snapshot with local fallback behavior in the admin service.
- Working tree is still uncommitted (continuation after pushed commit `378856c`), but current local validation is green.

### Completed work
- Closed test/typing gaps in the in-progress admin status + health work:
  - synced `tests/services/admin.service.test.ts` mocks/capability shape to new admin provider capabilities (`canUpdateUserStatusRemote`, `canGetHealthRemote`, detail strings)
  - added service coverage for `adminService.getHealth()` remote path and local-fallback paths
  - removed stale unused import in `src/services/admin.provider.ts` after admin-specific user schema split
- Implemented/validated `PMN-074` admin health endpoint slice (provider/service-first pattern):
  - config/validation support for `backend.genericRest.admin.endpoints.health`
  - provider capability/detail fields:
    - `canGetHealthRemote`
    - `getHealthDetail`
  - provider method `getHealth(...)` with payload normalization for:
    - raw object
    - `{ health }`
    - `{ success: true, data: ... }`
  - health status normalization (`degraded -> warning`, `down -> error`)
  - admin service `getHealth()` / `refreshHealth()` with local fallback on `UNAUTHORIZED` / `CONFIG` / `NOT_SUPPORTED`
  - new hook `useAdminHealth()`
  - new screen/route `/(admin)/health` + admin index routing to `./health`
- Added/expanded tests:
  - `tests/services/admin.provider.test.ts` (`getHealth` normalization + unauthorized mapping; `updateUserStatus` unauthorized coverage)
  - `tests/services/admin.service.test.ts` (`getHealth` remote + fallback coverage)
- Validation (latest local):
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`54` tests)

### Open tasks
- Continue `PMN-074` with the next provider-backed endpoint slice (`logs` recommended next, then admin settings/locks).
- Decide whether admin users-list should get inline enable/disable controls (currently supported in user detail only).
- Add admin hook/UI tests if admin state complexity continues to grow (current coverage is provider/service-heavy).

### Recommended next step
- Implement `PMN-074` admin logs endpoint slice using the same provider/service-first pattern (`generic-rest` config endpoint + provider normalization + service fallback + hook/screen + tests), then revisit inline status controls as UX polish.

### Remaining risks / TODO
- Admin `health` and `status` flows are generic-rest-first; `supabase` admin provider remains a stub and will continue to show fallback/unsupported behavior.
- Provider error messages are surfaced in admin mutations, but backend policy messages may still be too raw for end-user/admin UX without a mapping layer.

## Session Update (2026-02-23, next phase start: PMN-074 user status update contract slice)

### Current status
- Started the next roadmap phase immediately after pushing the large `PMN-070`/`PMN-071`/`PMN-074` batch (`378856c`): `PMN-074` user status/disable mutation contract (provider/service-first).
- Added generic-rest endpoint/config scaffolding and provider/service mutation methods for user status updates (disabled/enabled toggle semantics).
- Admin User Detail now has capability-gated `Enable user` / `Disable user` actions wired through `useAdminUser.updateStatus(...)`.
- Admin status mutation hardening pass is also complete in the working tree:
  - admin provider unauthorized mapping coverage for `updateUserStatus()`
  - admin service `NOT_SUPPORTED` coverage for status mutation
  - `useAdminUser` now preserves provider error messages for role/status mutations instead of always showing generic failure text

### Completed work (next phase start)
- Added optional config endpoint:
  - `backend.genericRest.admin.endpoints.updateUserStatus`
- Extended admin provider capabilities/contracts:
  - `canUpdateUserStatusRemote`
  - `updateUserStatusDetail`
  - `updateUserStatus({ userId, disabled })`
- Implemented generic-rest provider path in `src/services/admin.provider.ts`:
  - `PATCH` to `updateUserStatus` endpoint template with `:id`
  - request body `{ disabled }`
  - reuses existing admin user payload normalization
- Added admin service wrapper:
  - `adminService.updateUserStatus(...)`
  - capability-gated `NOT_SUPPORTED` handling
  - normalized user result shape
- Extended admin user-detail state/UI for status updates:
  - `useAdminUser.updateStatus(...)` + `isUpdatingStatus` / `statusUpdateError`
  - `/(admin)/users/[id]` status badge + enable/disable action buttons
  - local optimistic fallback when backend response omits `disabled` field (uses requested boolean)
- Added tests:
  - `tests/services/admin.provider.test.ts` (`updateUserStatus` request/normalization)
  - `tests/services/admin.service.test.ts` (`updateUserStatus` service wrapper)
- Added hardening test coverage:
  - `tests/services/admin.provider.test.ts` (`updateUserStatus` maps `403 -> UNAUTHORIZED`)
  - `tests/services/admin.service.test.ts` (`updateUserStatus` `NOT_SUPPORTED` capability path)
- Validation after starting this slice:
- Validation after status UI + hardening pass:
  - `npm run typecheck` passed
  - `npm test -- --run` passed (`49` tests)

### Open tasks
- Decide status model UX (single `Disable/Enable` action vs richer status enum in future).
- Add backend-policy-aware UI messaging for forbidden/self-targeted status actions.
- (Done) provider/service error-mapping coverage for `updateUserStatus()` unauthorized/unsupported paths.
- Consider adding admin hook tests for mutation error-message propagation if admin detail flow complexity grows.

### Recommended next step
- Decide whether to expose status controls in the admin users list for quicker bulk operations, or continue with another admin mutation endpoint (`health`/`logs`/user locks) first.

### Remaining risks / TODO
- Current status mutation contract uses `{ disabled: boolean }` as a normalized request shape; if backend teams require a different payload (e.g., `{ status: 'disabled' }`), document/map it explicitly before wider adoption.

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
