# KayVee

A personal trading companion for Deriv - synthetic indices, forex, and
Deriv's "Options" contract types (Rise/Fall, Higher/Lower, Touch/No Touch,
Matches/Differs, Even/Odd, Over/Under), built with Expo (React Native) and
Supabase.

## Read this first - things that need your input before it fully works

1. **Deriv app_id.** `33PS9fv2cnxtaxyxyKLXL` is your real, registered app_id
   (confirmed in your Deriv Developer Dashboard under Registered Apps -
   "KAYVEE", OAuth type, Trade/Application insights/Account management/
   Payments scopes) - already set in `.env` and `eas.json`, nothing to do
   here.

2. **EAS project.** `app.json` intentionally does **not** include an
   `extra.eas.projectId`. Your existing project (seen in your build
   history as `kvrwd/kayvee`) already has one - if you run `eas build` and
   it offers to create a new project, say no and instead run
   `eas init --id <your-existing-project-id>`, or copy the `projectId`
   from your current `app.json` into this one. Losing that link would
   fork your build/credentials history onto a brand new project.

3. **Trading engine used.** This talks to Deriv's own WebSocket API
   (`wss://ws.derivws.com/websockets/v3`) directly - that's what powers
   synthetic indices, forex, and Options contracts here. It does **not**
   integrate with the MetaTrader 5 terminal/bridge (a separate protocol) -
   if you also want MT5-specific CFD trading inside the app itself, that
   needs a different integration (e.g. a MetaApi.cloud bridge), which
   isn't wired up here.

4. **No Kayvee account system.** Per your latest instructions there is no
   sign-up/login of Kayvee's own - a random id generated once per device
   stands in for identity. The gate code you type in decides your role:
   the regular code unlocks the app as a user, the admin code additionally
   unlocks the Admin Panel. Anyone who has the regular code (or reverse-
   engineers `app_settings`, which is openly readable, same as before)
   can get in - that's an accepted tradeoff of not having real accounts,
   not something this build can fully close.

5. **"Ask Again" (rotate the gate code) is best-effort, not instant.** No
   app can force another phone to close itself in the background - that's
   restricted by both Android and iOS. What actually happens: any device
   with the app **open** re-checks within ~45 seconds and gets sent back
   to the gate screen; any device that's closed gets sent back the moment
   it's next opened. A Telegram alert fires when you rotate the code (the
   new code itself is never included in that message), and the Admin
   Panel's user list shows who has re-entered it.

## One-time backend setup (Supabase)

1. Open the SQL editor for your project and run `supabase/schema.sql`.
2. Set the real secrets (values are in `supabase/.env.local`, which is
   git-ignored - it is a record for you, not something Supabase reads
   automatically):
   ```
   supabase link --project-ref yinahmyovgdzxvptvzhe
   supabase secrets set TELEGRAM_BOT_TOKEN=...
   supabase secrets set TELEGRAM_CHAT_ID=...
   supabase secrets set ADMIN_ACCESS_KEY=...
   ```
3. Deploy the two functions:
   ```
   supabase functions deploy submit-profile
   supabase functions deploy admin-actions
   ```
4. In the app's Admin Panel, enter the same `ADMIN_ACCESS_KEY` you set
   above - that's what unlocks the user list and the "Ask Again" control.
   It's a different value from the on-device admin gate code
   (`123654V` by default) on purpose: the gate code just decides what
   shows up in the drawer, the Admin Access Key is the thing the server
   actually checks.

## Building

```
npm install
npx expo-doctor          # should read 18/18 with no issues
eas build --platform android --profile preview   # sideloadable .apk
eas build --platform android --profile production # .aab for Play Store, later
```

Lint tooling (ESLint) is intentionally **not** included in this build.
Mixing ESLint 8/9/10 and `eslint-config-expo` was the direct cause of the
`npm ci` failures you hit on EAS before (`ERESOLVE` conflicts) - dropping
it removes an entire class of dependency conflicts and has zero effect on
how the app itself runs, since lint never ships inside the app bundle. Add
it back later, on its own, whenever it's convenient.

`eas.json` still keeps `--legacy-peer-deps` as a safety net for the
install step, and `package.json` keeps the `eas-build-pre-install` hook
that sets it - both harmless, both cheap insurance.

## App icon

Per `README_ASSETS.txt`, the icon/splash artwork you supplied is a
Flaticon "Letter K" icon ("Letter k icons created by Alphabets Number -
Flaticon") - keep whatever attribution or license your Flaticon account
requires for it.

## Project layout

- `src/context` - Theme and Session (device identity, gate/role, onboarding
  profile, linked Deriv accounts) state.
- `src/services` - Supabase client, Deriv WebSocket client, symbol/contract
  catalog, sanitizers, simple informational strategy signals.
- `src/screens` - Gate, onboarding (email/name/birth date), connect-to-
  Deriv, Dashboard, Trade, Accounts, Admin Panel.
- `src/navigation` - Drawer + the top-level flow routing.
- `supabase/` - schema, edge functions, secrets record.
