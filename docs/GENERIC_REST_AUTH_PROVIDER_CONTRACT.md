# Generic REST Auth Provider Contract

This document defines the auth payloads expected by PMNative when `backend.provider = 'generic-rest'`.

## Goal

Allow PMNative to work with any REST backend without hardcoding Puppet Master backend assumptions.

The contract is configurable by endpoint paths, but payload shape must match one of the accepted formats below.

## Config Example

`src/pm-native.config.ts`

```ts
backend: {
  provider: 'generic-rest',
  genericRest: {
    auth: {
      endpoints: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        session: '/auth/session',
        refresh: '/auth/refresh',
        // PMN-021 (social auth) proposed extension:
        // socialCapabilities: '/auth/social/capabilities',
        // socialStart: '/auth/social/start',
        // socialComplete: '/auth/social/complete'
      }
    },
    // PMN-071 (settings sync) optional extension:
    // settings: {
    //   endpoints: {
    //     sync: '/settings/sync'
    //   }
    // }
  }
}
```

## User Shape

Required normalized fields used by PMNative:

```json
{
  "id": "string-or-number",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "master|admin|editor|user"
}
```

Notes:
- `id` may be `string` or `number` (PMNative normalizes to string).
- `name` may be `null`.

## Login / Register Response

Accepted variants:

### Variant A
```json
{
  "token": "access-token",
  "refreshToken": "refresh-token",
  "user": { "...": "..." }
}
```

### Variant B
```json
{
  "accessToken": "access-token",
  "refreshToken": "refresh-token",
  "user": { "...": "..." }
}
```

### Variant C (success envelope)
```json
{
  "success": true,
  "data": {
    "token": "access-token",
    "refreshToken": "refresh-token",
    "user": { "...": "..." }
  }
}
```

`data.accessToken` is also accepted in Variant C.

## Session User Response (`/auth/session`)

Accepted variants:

### Variant A
```json
{
  "user": { "...": "..." }
}
```

### Variant B
```json
{
  "token": "optional-access-token",
  "refreshToken": "optional-refresh-token",
  "user": { "...": "..." }
}
```

### Variant C (success envelope)
```json
{
  "success": true,
  "data": {
    "user": { "...": "..." }
  }
}
```

## Refresh Response (`/auth/refresh`)

Accepted variants:

### Variant A
```json
{
  "token": "new-access-token",
  "refreshToken": "new-refresh-token-or-null",
  "user": { "...": "..." }
}
```

### Variant B
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token-or-null",
  "user": { "...": "..." }
}
```

### Variant C (success envelope)
```json
{
  "success": true,
  "data": {
    "token": "new-access-token",
    "refreshToken": "new-refresh-token-or-null",
    "user": { "...": "..." }
  }
}
```

`user` is optional on refresh.

## Logout Endpoint

PMNative sends:
- `POST` to configured logout endpoint
- `Authorization: Bearer <accessToken>` header (when access token exists)

Response body is ignored on success.

## Error Shape (Recommended)

Recommended error response shape for good UX:

```json
{
  "message": "Human-readable error",
  "code": "MACHINE_CODE"
}
```

If missing, PMNative falls back to generic request error messages.

## Social Auth (PMN-021) — Proposed Contract Extension

This section defines a proposed extension for out-of-the-box social auth support in PMNative (`Google`, `Telegram`, `VK`) when using `backend.provider = 'generic-rest'`.

Status:

- roadmap-approved
- contract extension proposal
- implementation may refine field names before release

### Supported Provider IDs

PMNative social auth provider IDs:

- `google`
- `telegram`
- `vk`

### Proposed Endpoint Config

Example config extension in `src/pm-native.config.ts`:

```ts
backend: {
  provider: 'generic-rest',
  genericRest: {
    auth: {
      endpoints: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        session: '/auth/session',
        refresh: '/auth/refresh',
        socialCapabilities: '/auth/social/capabilities',
        socialStart: '/auth/social/start',
        socialComplete: '/auth/social/complete'
      }
    }
  }
}
```

Notes:

- `socialCapabilities` is optional but recommended for provider-gated UI.
- `socialStart` and `socialComplete` may be collapsed into a single endpoint by your backend if the flow returns a session directly.

### Social Capabilities Response (Optional)

Purpose:

- let PMNative know which providers are currently supported/configured by the backend
- avoid rendering broken buttons

Accepted variants:

#### Variant A
```json
{
  "google": true,
  "telegram": false,
  "vk": false
}
```

#### Variant B
```json
{
  "socialAuth": {
    "google": true,
    "telegram": false,
    "vk": false
  }
}
```

#### Variant C (success envelope)
```json
{
  "success": true,
  "data": {
    "socialAuth": {
      "google": true,
      "telegram": false,
      "vk": false
    }
  }
}
```

If this endpoint is not implemented, PMNative should fall back to config-based visibility and/or typed `NOT_SUPPORTED` handling.

### Social Auth Start (`/auth/social/start`)

Purpose:

- begin provider auth flow and return either:
  - a launch URL (OAuth/redirect flow), or
  - an immediate normalized session (backend-handled auth)

PMNative request (recommended):

```json
{
  "provider": "google|telegram|vk",
  "redirectUri": "[CALLBACK_URL]",
  "mode": "login|register"
}
```

`mode` helps backend analytics/UX but does not need to change session semantics.

Accepted response variants:

#### Variant A (redirect URL)
```json
{
  "url": "https://provider.example.com/oauth/start"
}
```

#### Variant B (success envelope + redirect URL)
```json
{
  "success": true,
  "data": {
    "url": "https://provider.example.com/oauth/start"
  }
}
```

#### Variant C (immediate session)

Any accepted **Login / Register Response** shape from this document is valid.

### Social Auth Complete (`/auth/social/complete`)

Purpose:

- exchange callback payload/code for a PMNative session (when backend requires explicit completion step)

PMNative request (recommended):

```json
{
  "provider": "google|telegram|vk",
  "url": "[FULL_CALLBACK_URL]"
}
```

Accepted response variants:

- Any accepted **Login / Register Response** shape from this document
- `204 No Content` / empty success when session was established out-of-band and `/auth/session` should be called next

### Social Auth Errors (Recommended)

Recommended machine codes for good UX and stable UI behavior:

```json
{
  "message": "Provider is not enabled",
  "code": "NOT_SUPPORTED"
}
```

Additional useful codes:

- `OAUTH_CANCELLED`
- `OAUTH_CALLBACK_INVALID`
- `OAUTH_EXCHANGE_FAILED`
- `PROVIDER_CONFIG_MISSING`

PMNative should map these to user-friendly messages and avoid raw backend/provider error leaks.

## Settings Sync (PMN-071) — Contract Extension

This section defines the current PMNative contract used by `settingsSyncProvider` when `backend.provider = 'generic-rest'` and `backend.genericRest.settings.endpoints.sync` is configured.

Status:

- implemented in PMNative (generic-rest provider path)
- backend endpoint remains app/backend responsibility

### Endpoint Config

PMNative config path:

- `backend.genericRest.settings.endpoints.sync`

Example:

```ts
backend: {
  provider: 'generic-rest',
  genericRest: {
    auth: {
      endpoints: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        session: '/auth/session',
        refresh: '/auth/refresh'
      }
    },
    settings: {
      endpoints: {
        sync: '/settings/sync'
      }
    },
    profile: {
      endpoints: {
        get: '/profile/me',
        update: '/profile/me'
      }
    },
    admin: {
      endpoints: {
        listUsers: '/admin/users'
      }
    }
  }
}
```

### Request (`POST /settings/sync`)

PMNative sends a typed draft payload with schema marker:

```json
{
  "schema": "pmnative.settings.sync/1",
  "backendProvider": "generic-rest|supabase",
  "actor": {
    "id": "user-id",
    "email": "admin@example.com",
    "role": "admin"
  },
  "preferences": {
    "notificationsEnabled": true,
    "analyticsEnabled": false
  },
  "context": {
    "source": "admin-settings",
    "hasAdminModule": true,
    "hasRemoteSyncEndpoint": true,
    "mode": "preview"
  }
}
```

Notes:

- `actor` may be `null` if no active user session exists (PMNative still allows preview/copy workflows).
- `backendProvider` reflects PMNative runtime config and may be useful for backend diagnostics/logging.
- `schema` should be used for versioning and future migration handling.

### Success Response (Required Shape)

Current PMNative generic-rest implementation requires:

```json
{
  "syncedAt": "2026-02-22T12:34:56.000Z"
}
```

Rules:

- `syncedAt` must be a non-empty string
- ISO 8601 UTC timestamp is strongly recommended

### Error Shape (Recommended)

Recommended backend error shape (same convention as auth endpoints):

```json
{
  "message": "Settings sync failed",
  "code": "SETTINGS_SYNC_FAILED"
}
```

Useful machine codes:

- `SETTINGS_SYNC_FAILED`
- `SETTINGS_CONFLICT`
- `SETTINGS_SCHEMA_UNSUPPORTED`
- `SETTINGS_VALIDATION_FAILED`
- `UNAUTHORIZED`

PMNative currently maps generic-rest settings sync provider errors into typed `SettingsSyncProviderError` codes (`CONFIG` / `PROVIDER`) at the framework layer.

## Profile (PMN-070) — Contract Extension

This section defines the current PMNative `generic-rest` profile fetch contract used by `profileProvider` when `backend.genericRest.profile.endpoints.get` is configured.

Status:

- remote fetch implemented (generic-rest, config-gated)
- update endpoint contract planned (`backend.genericRest.profile.endpoints.update`)

### Endpoint Config

PMNative config path:

- `backend.genericRest.profile.endpoints.get`
- `backend.genericRest.profile.endpoints.update` (reserved for upcoming profile update flow)

Example:

```ts
backend: {
  provider: 'generic-rest',
  genericRest: {
    auth: {
      endpoints: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        session: '/auth/session',
        refresh: '/auth/refresh'
      }
    },
    profile: {
      endpoints: {
        get: '/profile/me',
        update: '/profile/me'
      }
    }
  }
}
```

### Profile Fetch (`GET /profile/me`)

PMNative sends:

- `GET` to configured endpoint
- `Authorization: Bearer <accessToken>` header

Accepted response variants:

#### Variant A (raw user)
```json
{
  "id": "123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "user"
}
```

#### Variant B (user envelope)
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "user"
  }
}
```

#### Variant C (success envelope)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "user"
    }
  }
}
```

User shape is the same normalized PMNative auth user shape documented above (`id`, `email`, `name`, `role`).

### Behavior Notes

- If the profile endpoint is not configured, PMNative falls back to the auth session snapshot for profile display.
- If configured but no access token is available, PMNative falls back to the auth session snapshot.
- Remote provider failures surface as profile refresh/load errors in the UI while retaining the last known profile state when possible.

## Admin Users List (PMN-074) — Contract Extension

This section defines the current PMNative `generic-rest` admin users list contract used by `adminProvider` when `backend.genericRest.admin.endpoints.listUsers` is configured.

Status:

- remote users list implemented (generic-rest, config-gated)
- broader admin contracts (roles/settings/user detail) still planned

### Endpoint Config

PMNative config path:

- `backend.genericRest.admin.endpoints.listUsers`

Example:

```ts
backend: {
  provider: 'generic-rest',
  genericRest: {
    auth: {
      endpoints: {
        login: '/auth/login',
        register: '/auth/register',
        logout: '/auth/logout',
        session: '/auth/session',
        refresh: '/auth/refresh'
      }
    },
    admin: {
      endpoints: {
        listUsers: '/admin/users'
      }
    }
  }
}
```

### List Users (`GET /admin/users`)

PMNative sends:

- `GET` to configured endpoint
- `Authorization: Bearer <accessToken>` header

Accepted response variants:

#### Variant A (raw array)
```json
[
  {
    "id": "123",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin"
  }
]
```

#### Variant B (users envelope)
```json
{
  "users": [
    {
      "id": "123",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin"
    }
  ]
}
```

#### Variant C (success envelope)
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "123",
        "email": "admin@example.com",
        "name": "Admin User",
        "role": "admin"
      }
    ]
  }
}
```

Notes:

- User object shape is the same normalized PMNative auth user shape.
- `name` may be `null`; PMNative currently renders `Unknown user` fallback in Admin Users UI.
- If the endpoint is not configured or no access token is available, PMNative falls back to a local placeholder directory containing the active session user.
