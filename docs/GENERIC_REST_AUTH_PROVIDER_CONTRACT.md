# Generic REST Auth Provider Contract

This document defines the auth payloads expected by PMNative when `backend.provider = 'generic-rest'`.

## Goal

Allow PMNative to work with any REST backend without hardcoding Puppet Master backend assumptions.

The contract is configurable by endpoint paths, but payload shape must match one of the accepted formats below.

## Config Example

`pm-native/src/pm-native.config.ts`

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
    }
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
