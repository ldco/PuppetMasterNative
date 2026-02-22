# PMNative Bootstrap Workspace

PMNative is an Expo/React Native framework bootstrap extracted from Puppet Master framework DNA:
- config-driven architecture
- RBAC + admin module patterns
- atomic component system
- provider-based backend integration

This folder is currently developed locally inside the parent PM repo, but it is intended to move to its own repository.

## Current Direction

- Default backend provider: `supabase`
- PMNative remains backend-agnostic via provider contracts (`supabase`, `generic-rest`, future providers)
- PM backend runtime compatibility is not a goal

## Local Status

- The `pm-native/` folder is intentionally ignored by the parent repo `.gitignore`
- Work can continue locally without affecting PM repo history
- Split readiness and handoff docs live in `pm-native/docs/`

## Quick Start

```bash
cd pm-native
npm install
cp .env.example .env.local   # or use your Expo env workflow
npm run start
```

Run a target:
- `npm run ios`
- `npm run android`
- `npm run web`

## Environment Variables

Required for default `supabase` provider:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional for `generic-rest` provider:
- `EXPO_PUBLIC_API_BASE_URL`

See:
- `pm-native/docs/SUPABASE_SETUP.md`
- `pm-native/docs/GENERIC_REST_AUTH_PROVIDER_CONTRACT.md`

## Provider Selection

Provider is selected in:
- `pm-native/src/pm-native.config.ts`

Options today:
- `supabase` (default)
- `generic-rest`

## Useful In-App Diagnostics

Open Admin Settings in the app to view:
- active backend provider
- required env var presence
- backend readiness diagnostics

## Key Files

- `pm-native/src/pm-native.config.ts`
- `pm-native/src/hooks/useConfig.ts`
- `pm-native/src/hooks/useAuth.ts`
- `pm-native/src/services/auth/provider.ts`
- `pm-native/src/services/auth/providers/supabaseAuthProvider.ts`
- `pm-native/src/services/auth/providers/genericRestAuthProvider.ts`
- `pm-native/docs/NEXT_CHAT_HANDOFF.md`
- `pm-native/docs/REPO_SPLIT_CRITERIA.md`
