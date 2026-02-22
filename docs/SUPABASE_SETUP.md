# Supabase Setup (PMNative)

PMNative is backend-agnostic, but the default auth provider is `supabase`.

## Required Environment Variables

Set these in your Expo environment (for local dev and builds):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional (only used by `generic-rest` provider):

- `EXPO_PUBLIC_API_BASE_URL`

## Provider Selection

In `pm-native/src/pm-native.config.ts`:

```ts
backend: {
  provider: 'supabase'
}
```

To use a custom REST API instead:

```ts
backend: {
  provider: 'generic-rest',
  genericRest: {
    auth: {
      endpoints: {
        login: '/auth/login',
        register: '/auth/register',
        forgotPassword: '/auth/forgot-password',
        logout: '/auth/logout',
        session: '/auth/session',
        refresh: '/auth/refresh'
      }
    }
  }
}
```

## Supabase Auth Notes

- PMNative maps Supabase users into PMNative roles.
- Role resolution order:
  1. `user.app_metadata.role`
  2. `user.user_metadata.role`
  3. fallback: `'user'`

Supported role values:
- `master`
- `admin`
- `editor`
- `user`

## Password Reset

PMNative forgot-password screen calls Supabase:
- `auth.resetPasswordForEmail(email)`

You may need to configure redirect URLs in Supabase Auth settings depending on your reset flow.

## Registration Behavior

- If Supabase returns an immediate session, PMNative signs the user in.
- If email confirmation is required and no session is returned, PMNative now:
  - shows a success toast instructing the user to check email
  - returns the user to the login screen
