# PMNative Backend Provider Strategy

## Core Principle

PMNative is a new project. We optimize for long-term architecture, not backward compatibility.

- No compatibility patches for legacy PM backend patterns
- No hidden adapters to preserve flawed contracts
- Refactor core architecture when direction changes
- Keep backend integration explicit and replaceable

## Target Direction

PMNative is:
- `Supabase-first` (first-party provider target)
- `Backend-agnostic` (must support other APIs/providers)

PMNative is not tied to Puppet Master backend runtime contracts.

## What PMNative Keeps From Puppet Master

Framework DNA only:
- config-driven architecture
- RBAC concepts / role naming
- atomic component architecture
- feature/module metadata patterns
- design token / theming approach
- admin UX structure ideas

## What PMNative Removes / Avoids

- hard dependency on PM backend auth endpoints
- PM-specific refresh/JWT assumptions inside core auth hooks
- runtime requirement for Puppet Master server
- roadmap decisions constrained by PM backend compatibility

## Backend Architecture (Required)

PMNative backend integration must be provider-based:

- `AuthProvider` interface for auth/session operations
- provider selection via config (`generic-rest`, `supabase`, future providers)
- generic transport remains reusable (`services/api.ts`) for REST APIs
- provider-specific parsing/contract logic lives in provider implementation, not in `useAuth()`

This keeps core auth state and UI independent from backend contract details.

## Provider Model

Current/Planned providers:

1. `generic-rest`
- Configurable auth endpoints
- Works with arbitrary REST APIs (not PM-specific)

2. `supabase` (first-party provider)
- Uses Supabase auth/session lifecycle
- No PM refresh endpoint assumptions

Status:
- `generic-rest` provider implemented
- `supabase` provider implemented
- Default provider in `pm-native.config.ts` is `supabase`

Future providers can be added without changing auth UI or auth store semantics.

## Implementation Rule

If a backend contract change requires branching in `useAuth()` or UI screens, stop and move that logic into a provider implementation instead.
