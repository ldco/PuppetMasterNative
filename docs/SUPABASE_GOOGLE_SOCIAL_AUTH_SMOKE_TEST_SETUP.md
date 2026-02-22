# Supabase Google Social Auth Smoke Test Setup (PMNative)

This guide is the exact setup path to run a real PMN-021 Google social auth smoke test in PMNative.

Use this when you want to test:

- Google login from `Login` screen
- Google registration from `Register` screen
- callback return to PMNative (`/oauth-callback`)
- session creation/hydration after the callback

## What You Need Before Starting

- A Supabase project you control
- A Google Cloud project (for OAuth client credentials)
- Local PMNative repo checked out
- Ability to run PMNative on:
  - web (`npm run web`) and/or
  - native (Expo Go / simulator)

## Part 1: PMNative Local Setup (Repo)

### 1. Fill in `.env`

File: `.env`

Replace the placeholders with real values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Where to get these in Supabase:

1. Open your Supabase project dashboard.
2. Go to `Project Settings` -> `API`.
3. Copy:
   - `Project URL` -> use as `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` key -> use as `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 2. Enable Google Social Auth in PMNative Config

File: `src/pm-native.config.ts`

Set:

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

Important:

- `google: true` must be enabled or the Google button stays hidden.

## Part 2: Google OAuth Credentials (Google Cloud Console)

Supabase needs Google OAuth credentials. These are configured in Google Cloud, then pasted into Supabase.

### 3. Open Google Cloud Console

Go to:

- `https://console.cloud.google.com/`

Then:

1. Select or create a Google Cloud project.
2. Open `APIs & Services`.

### 4. Configure OAuth Consent Screen

Path:

- `APIs & Services` -> `OAuth consent screen`

Do this:

1. Choose app type (typically `External` for testing unless your org requires `Internal`).
2. Fill required fields (app name, support email, developer contact email).
3. Save.

For testing:

- Add test users (your Google account) if the app is not published.

### 5. Create OAuth Client Credentials

Path:

- `APIs & Services` -> `Credentials` -> `+ Create Credentials` -> `OAuth client ID`

Choose:

- Application type: `Web application`

Add Authorized redirect URI:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

This is the Supabase callback URL (not the PMNative callback URL).

Then:

1. Create the client.
2. Copy the generated:
   - Client ID
   - Client Secret

## Part 3: Supabase Auth Provider Setup (Google)

### 6. Open Supabase Google Provider Settings

Go to your Supabase project dashboard, then:

- `Authentication` -> `Providers` -> `Google`

Do this:

1. Enable Google provider.
2. Paste:
   - Google Client ID
   - Google Client Secret
3. Save.

## Part 4: Supabase URL Configuration (PMNative Callback URLs)

Supabase must allow PMNative callback URLs (the URLs PMNative uses after Supabase completes auth).

### 7. Run PMNative Once to Read the Callback URLs

Start the app:

```bash
npm run web
```

Then in the app:

1. Open `Admin` -> `Settings` -> `Backend Diagnostics`
2. Find and copy:
   - `Social callback URL (runtime)`
   - `Supabase allow-list (web)` (if available)
   - optionally `Supabase allow-list snippet` (newline-separated list)

Notes:

- PMNative now provides tap-to-copy on these rows.
- The runtime callback may be native-scheme based (example: `pmnative://oauth-callback`) depending on runtime.
- Web callback is your current web origin + `/oauth-callback`.

### 8. Add Redirect URLs in Supabase

Path in Supabase:

- `Authentication` -> `URL Configuration`

Add PMNative callback URLs to the redirect allow-list / additional redirect URLs.

At minimum add:

- Native callback URL from PMNative diagnostics (for native testing)
- Web callback URL from PMNative diagnostics (for web testing)

If you use the PMNative diagnostics snippet:

- Paste the copied `Supabase allow-list snippet` directly into your notes/checklist, then add each URL in Supabase UI as required.

## Part 5: Run the Smoke Test (Web + Native)

### 9. Web Smoke Test

1. Run:

```bash
npm run web
```

2. Open PMNative auth screen.
3. Click `Continue with Google` on:
   - `Login`
   - `Register`
4. Sign in with a Google test user.
5. Confirm:
   - app returns to PMNative
   - callback completes
   - session is created
   - user lands in authenticated area (`/(tabs)`)

### 10. Native Smoke Test (Optional but Recommended)

Run one target:

```bash
npm run ios
```

or

```bash
npm run android
```

Then:

1. Start Google social auth from login/register.
2. Verify PMNative native auth session opens (`expo-web-browser` auth session path).
3. Complete Google login.
4. Confirm callback returns to PMNative and session is created.

Fallback behavior:

- PMNative attempts native auth session first.
- If unavailable, it falls back to deep-link flow (`Linking.openURL`).

## Expected Results

- Google button is visible (because `backend.socialAuth.google = true`)
- No `NOT_SUPPORTED` error for Google
- No callback mismatch error (provider/mode correlation passes)
- Login/Register social flow ends with an authenticated PMNative session

## Common Failure Points (Check These First)

### Google button is hidden

Check:

- `src/pm-native.config.ts` -> `backend.socialAuth.google = true`
- `backend.provider = 'supabase'`

### “Missing Supabase URL env” / “Missing Supabase anon key env”

Check:

- `.env` exists
- values are real (not placeholders)
- restart Expo after changing env vars

### Google login starts but callback fails

Check:

- Supabase `Authentication` -> `URL Configuration` contains the PMNative callback URLs
- callback URL copied from PMNative diagnostics matches what you added
- Google provider is enabled in Supabase

### Google provider errors in Supabase

Check:

- Google Cloud OAuth client redirect URI is exactly:
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Client ID / Secret in Supabase are from the same Google Cloud OAuth client

## What to Record After the Smoke Test

When you finish testing, record in:

- `docs/NEXT_CHAT_HANDOFF.md`
- `docs/pmnative/PMN-021_SOCIAL_AUTH.md`

Include:

- web result (pass/fail + notes)
- native result (pass/fail + notes)
- callback URLs used
- any platform-specific quirks (`expo-web-browser` auth session vs fallback)
