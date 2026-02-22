# PMNative Repo Split Criteria

PMNative moves to its own repo when the items below are complete.

## Required Before Split

1. PMNative runtime has no Puppet Master backend dependency
- no PM-specific endpoint assumptions in core auth/app logic
- no PM repo runtime services required to boot the app

2. Backend provider architecture is in place
- provider-based auth integration in core
- at least one production-ready provider implementation (Supabase target)
- documented contract for `generic-rest` provider

3. PMNative project docs live in `pm-native/docs/`
- architecture
- backend provider strategy
- setup/env
- roadmap/handoff (or equivalent)

4. PMNative repo can run independently
- package scripts
- env examples
- CI/lint/typecheck baseline
- local setup instructions

5. Framework DNA extraction is complete
- UI primitives / component architecture we want to keep
- config patterns we want to keep
- role/module patterns we want to keep

## Nice to Have (But Not Strictly Blocking)

- tests for auth provider flows
- skeleton/loading states
- additional providers beyond Supabase

## Current Direction

- Supabase should be a first-party provider
- PMNative must remain backend-agnostic (support arbitrary APIs via providers)
