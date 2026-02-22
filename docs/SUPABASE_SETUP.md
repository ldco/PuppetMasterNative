# Supabase Setup (PMNative)

PMNative is backend-agnostic, but the default auth provider is `supabase`.

Framework-first note:

- You can continue most PMNative framework implementation without real Supabase credentials.
- Real Supabase values are only required for live integration validation (manual auth/social smoke tests).

## Required Environment Variables

Set these in your Expo environment (for local dev and builds):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional (only used by `generic-rest` provider):

- `EXPO_PUBLIC_API_BASE_URL`

## Provider Selection

In `src/pm-native.config.ts`:

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

## Social Auth (PMN-021 Preparation)

For the exact end-to-end Google smoke-test setup (PMNative + Google Cloud + Supabase dashboard paths), use:

- `docs/SUPABASE_GOOGLE_SOCIAL_AUTH_SMOKE_TEST_SETUP.md`

PMNative's roadmap now includes out-of-the-box social auth support for:

- `Google`
- `Telegram`
- `VK`

Important implementation direction:

- PMNative remains backend-agnostic
- Supabase is the default provider and the first integration path
- UI must be capability-gated (show only supported/configured providers)
- Unsupported providers must be hidden or return a typed `NOT_SUPPORTED` error (not raw SDK errors)

### Current Recommended Supabase Path

- `Google`: primary Supabase social auth candidate (implement first)
- `Telegram`: only enable when your active backend/provider adapter supports it
- `VK`: only enable when your active backend/provider adapter supports it

If `Telegram` / `VK` are not available in your current Supabase setup or adapter implementation:

- leave them disabled in config
- do not render the buttons in auth screens

### Supabase Dashboard Setup (Google)

1. Open your Supabase project dashboard.
2. Go to Auth provider configuration (Google provider).
3. Enable Google sign-in.
4. Add your app callback/redirect URLs.
5. Copy any required client credentials into your secure project setup (not into repo docs).

Use placeholders until your app callback flow is finalized:

- Native scheme callback: `[YOUR_EXPO_SCHEME]://[YOUR_AUTH_CALLBACK_PATH]`
- Web callback: `https://[YOUR_WEB_DOMAIN]/[YOUR_AUTH_CALLBACK_PATH]`

PMNative currently uses the Expo scheme from `app.json`:

- `pmnative` (default in this repo)

### PMNative Configuration Direction (Social Provider Visibility)

PMN-021 introduces a config-driven social auth visibility model (example shape, subject to implementation):

```ts
backend: {
  provider: 'supabase',
  socialAuth: {
    google: true,
    telegram: false,
    vk: false
  }
}
```

Guidance:

- Start with `google: true` only
- Enable `telegram` / `vk` only after provider capability support is implemented and validated

### Testing Expectations (When Social Auth Is Implemented)

For each enabled provider:

- login/sign-in succeeds
- first-time registration path creates/restores a PMNative session
- app returns to a protected screen after callback flow
- app restart hydrates session correctly
- logout clears local session state

## Password Reset

PMNative forgot-password screen calls Supabase:
- `auth.resetPasswordForEmail(email)`

You may need to configure redirect URLs in Supabase Auth settings depending on your reset flow.

## Registration Behavior

- If Supabase returns an immediate session, PMNative signs the user in.
- If email confirmation is required and no session is returned, PMNative now:
  - shows a success toast instructing the user to check email
  - returns the user to the login screen
