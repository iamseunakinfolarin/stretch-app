# Stretch

Pray deliberately. Keep the hours.

Stretch is a mobile-first prayer web app (a PWA) for iPhone and Android, installed to the home screen from the browser. This repository is at **Phase 1: foundation**: the app shell, the installable manifest, and the complete v1 database with its security rules and tests. Feature screens come in later phases.

> **Placeholders to lock in Phase 6:** the app name ("Stretch"), the manifest `id` (`/`) and the icons (a plain letter S) are placeholders. Changing a manifest `id` after people have installed the app makes phones treat it as a different app, so it is decided once, in Phase 6. There is no service worker or offline support yet.

## Stack

Next.js 16 (App Router, TypeScript strict, Tailwind CSS 4), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest, Playwright, SQL tests.

## Install

You need Node 20.9 or newer (built with Node 22).

```bash
npm install
```

## Environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard, your project, **Project Settings > Data API > Project URL** (looks like `https://abcd1234.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard, **Project Settings > API Keys > Publishable key** (starts with `sb_publishable_`) |
| `NEXT_PUBLIC_SITE_URL` | The public address of the app. `http://localhost:3000` locally. Used only to build share links. Leave it empty and the app uses whatever address it is open on |

Both Supabase values are public by design and safe in the browser. **Never put the Supabase secret key, the `service_role` key or the database password anywhere in this project**, including Vercel. The app does not need them.

`.env.local` is ignored by git. If either Supabase variable is missing, the app shows a "Stretch is not connected yet" screen naming the missing variable instead of crashing.

## Run

```bash
npm run dev
```

Open http://localhost:3000. The Profile tab shows **Database connected** when the app can reach Supabase.

## Checks

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run test:e2e
```

```bash
npm run test:db
```

- `npm test` runs the Vitest unit tests.
- `npm run test:e2e` runs the Playwright smoke test at 390x844 and 412x915 and saves screenshots to `docs/screenshots/`. To run it against a deployed preview: `PLAYWRIGHT_BASE_URL=https://your-preview.vercel.app npm run test:e2e`.
- `npm run test:db` runs the SQL security tests. See [supabase/tests/README.md](supabase/tests/README.md).

## Database

The database lives in a hosted Supabase project named **Stretch**. Its schema is in `supabase/migrations/`. Every change is written there first, then that same SQL is applied to the hosted project through the Supabase connector (`apply_migration`). The file names carry the versions recorded on the hosted project.

### What is in it

| Table | Holds |
|---|---|
| `profiles` | One row per person, created automatically when they sign up. `display_name` is empty until onboarding |
| `prayers` | Prayers and altars, each owned by one person |
| `prayer_members` | Who belongs to which prayer, as owner or member |
| `prayer_invites` | The current 8 character invite code for a prayer |
| `prayer_points` | The ordered points of a prayer |
| `scriptures` | The key scriptures of a prayer |
| `prayer_sessions` | The stretches: timed prayer sessions |
| `entries` | Notes and testimonies, personal or shared |

Row level security is on for every table. In short: people can read and change only what belongs to them or to prayers they have joined, and only the owner can change a prayer. Signed-out visitors can call `ping()` and nothing else.

| Function | What it does |
|---|---|
| `ping()` | Returns `ok`. The Profile tab uses it to show "Database connected" |
| `create_or_reset_invite(prayer_id)` | Owner only. Creates or replaces the invite code |
| `join_prayer_by_code(code)` | Adds the caller to a prayer as a member |
| `complete_session(...)` | Saves a stretch and an optional note. Under one minute is discarded; credit is capped at 24 hours |
| `get_prayer_hours(prayer_ids)` | The caller's seconds and the group's seconds for prayers they belong to |
| `get_my_hours(since)` | The caller's own seconds since a date, and in total |
| `delete_my_account()` | Deletes the caller's account, their data and the prayers they own |

Helper functions used only by the security rules live in a `private` schema, which the API does not expose.

### Types

`src/types/database.ts` is generated from the hosted project's live schema with the Supabase connector (`generate_typescript_types`). Do not edit it by hand. `npm run gen:types` produces the same types from the local database, which is useful while a migration is still in progress.

### Local database

For development and tests (needs Docker):

```bash
npm run db:start
```

```bash
npm run db:reset
```

`db:reset` rebuilds the local database from the migration files. To use the local database from the app, set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the publishable key printed by `npx supabase status`.

### Changing the schema

1. Add a new file under `supabase/migrations/`. Never edit a migration that has been applied.
2. Apply it locally with `npm run db:reset` and run `npm run test:db`.
3. Apply the same SQL to the hosted project with the Supabase connector.
4. Rename the file to the version the hosted project recorded.
5. Run the tests against the hosted project (see [supabase/tests/README.md](supabase/tests/README.md)) and the security and performance advisors.
6. Regenerate `src/types/database.ts` from the hosted project.

## Run this project from a cloud session

These steps are for working on Stretch in a Claude Code cloud session (claude.ai/code), where nothing is installed yet.

**Before starting the session**

1. Give Claude access to the repository: at https://claude.ai/connect-github, make sure the Claude GitHub App can see `stretch-app`.
2. Connect Supabase: at https://claude.ai/customize/connectors, add the Supabase connector.
3. Start the session with the `stretch-app` repository and the **stretch-app** environment selected. That environment allows the session to reach the hosted Supabase project and the Vercel preview. The Default environment blocks both.

**In the session**

```bash
git clone https://github.com/iamseunakinfolarin/stretch-app
```

```bash
cd stretch-app && npm install
```

```bash
cp .env.example .env.local
```

Fill `.env.local` with the project URL and publishable key. Both are public, and Claude can read them from the Supabase connector (`get_project_url` and `get_publishable_keys`), so nothing needs to be pasted into the chat. Never put the secret key or database password in the session.

```bash
npm run dev
```

Then run the checks listed under [Checks](#checks).

**Things that behave differently in a cloud session**

- **The connector can see every Supabase project in the organization.** Only the project named Stretch belongs to this app.
- **The local database needs Docker**, and the Docker daemon is not running when a session starts. Start it with `dockerd` in the background, then `npm run db:start`. The first start downloads the Supabase images and takes a few minutes.
- **Playwright** uses the Chromium already installed in the session. `@playwright/test` is pinned to the matching version, so do not run `playwright install`.
- **GitHub from the command line:** `gh pr create` fails because GraphQL is not available. Use the REST API, for example `gh api repos/iamseunakinfolarin/stretch-app/pulls -X POST ...`.
- **The session is temporary.** Anything not committed and pushed is lost when it ends.

## Open the app on your phone (Vercel preview)

1. In Vercel, choose **Add New > Project** and import this GitHub repository. Keep the defaults (framework: Next.js).
2. Under **Environment Variables**, add the three variables above for the **Production** and **Preview** environments. Leave `NEXT_PUBLIC_SITE_URL` empty for previews so share links use the preview address.
3. Deploy. Every branch and pull request then gets its own preview address. Find it on the pull request (the Vercel comment) or in Vercel under **Deployments**.
4. Open that address in **Safari on iPhone** or **Chrome on Android**. If Vercel asks you to sign in, either sign in with your Vercel account on the phone, or turn off **Settings > Deployment Protection > Vercel Authentication** for the project.

You should see the Pray screen with four tabs along the bottom. Tap Profile and you should see **Database connected**.

## Add it to your home screen

**iPhone (Safari):** tap the Share button, then **Add to Home Screen**, then **Add**. It must be Safari; other iPhone browsers may not offer this.

**Android (Chrome):** tap the three-dot menu, then **Add to Home screen** (or **Install app**), then **Install**.

In both cases you should get a dark green icon with a letter S, named Stretch. Opening it should show the app full screen, with no browser address bar, in portrait, with the tab bar clear of the home bar.

## Project layout

```
src/app          routes: (tabs) holds the four tab screens; prayer/[id] and stretch/[prayerId] are full screen
src/components   shared UI: TabBar, ConfirmDialog, PageHeader, MissingConfig
src/features     code that belongs to one feature
src/lib          Supabase clients (lib/supabase) and helpers
src/types        database.ts, generated from the schema
supabase/migrations   the schema, security rules and database functions
supabase/tests        SQL tests that prove the security rules
e2e              Playwright smoke test
docs             screenshots, and later the prototype
```

Conventions for anyone (or any AI assistant) working here are in [CLAUDE.md](CLAUDE.md). Confirmations always use `src/components/ConfirmDialog`, never `window.confirm` or `window.alert`. Theme tokens (colors, type, spacing, radii) are in `src/app/globals.css`.
