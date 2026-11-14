# Stretch

Pray deliberately. Keep the hours.

Stretch is a mobile-first prayer web app (a PWA) for iPhone and Android, installed to the home screen from the browser. This repository is at **Phase 3: prayers and altars**. People can sign in, then create and manage prayers and altars, each with prayer points and key scriptures. The stretch (the timed prayer session), notes, testimonies and sharing come in later phases.

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

Open http://localhost:3000. You will land on the sign-in screen. Create an account to get in.

## Signing in

Stretch uses **email and password**, with no emails sent. This is the simplest setup that works while the app is only for friends and family.

| Screen | What it does |
|---|---|
| `/sign-up` | Create an account with an email and a password of 8 characters or more. You are signed in straight away |
| `/sign-in` | Sign in |
| `/welcome` | Asks for your name the first time. Nobody reaches the app without one |
| Profile tab | Shows your name and email. Change your name, sign out, or delete your account |

Signed-out visitors are always sent to `/sign-in`. That check runs in `src/lib/supabase/proxy.ts`. The name check runs in `src/features/profile/ProfileGate.tsx`, which wraps every screen inside the app.

**The one Supabase setting this needs:** in the Supabase dashboard, open the **Stretch** project, then **Authentication > Sign In / Providers > Email**, and turn **Confirm email** off. While it is on, new accounts wait for a confirmation email that Supabase's built-in email service only delivers to members of your Supabase organization, so nobody else can sign up.

**What this setup does not do, on purpose:**

- **No "forgot password" email.** If someone forgets their password, the project owner resets it (ask Claude to do it through the Supabase connector, or remove the user under Authentication > Users so they can sign up again).
- **Email addresses are not verified.** Anyone with the web address can create an account. They see only their own data.

Before opening Stretch beyond friends and family: add an email service (custom SMTP), turn **Confirm email** back on, and consider one-time codes in place of passwords. The sign-in form lives in one component, `src/features/auth/AuthForm.tsx`, so that change stays small.

## Prayers and altars

A **prayer** is something specific you are asking for. An **altar** is a long-term prayer you keep returning to. A **stretch** is one timed session of prayer (Phase 4).

| Screen | Address | What it does |
|---|---|---|
| Pray | `/` | Tiles for your active altars and prayers. The + button starts a new one |
| My Prayers | `/prayers` | Three lists with counts: Prayers, Altars, Archived |
| New | `/prayers/new` | Title (1 to 80 characters), type, an optional plan, prayer points, key scriptures |
| Detail | `/prayers/[id]` | Title, type, plan, hours so far, points, scriptures, and Edit, Archive, Delete |
| Edit | `/prayers/[id]/edit` | The same form. The type is fixed once created |

- **Plan (optional):** a target of 1 to 10,000 hours, and for prayers a start and end date. Altars have no end date.
- **Limits:** up to 20 prayer points of 300 characters, and up to 10 key scriptures.
- **Archive** sets a prayer aside: it leaves the active lists, keeps everything, and can be reactivated. It cannot be edited while archived.
- **Delete** asks first, then removes the prayer and everything under it.
- **Privacy:** a prayer that does not exist and a prayer that is not yours show the same not-found page.

The code lives in `src/features/prayers/`. Reads are in `queries.ts`, writes in `mutations.ts`, input rules in `validation.ts`. Saving is one all-or-nothing call to the `save_prayer` database function, so a dropped connection can never leave a prayer half saved.

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
- `npm run test:e2e` runs the Playwright tests at 390x844 and 412x915 and saves screenshots to `docs/screenshots/`. They sign up real accounts, so they run against the **local** Supabase stack: start it first with `npm run db:start`. Every account a test creates is deleted again through the app's own "Delete account" button.
  - Against the hosted project (creates and deletes real accounts there): `STRETCH_E2E_TARGET=hosted npm run test:e2e`
  - Against a deployed address: `PLAYWRIGHT_BASE_URL=https://your-address.vercel.app npm run test:e2e`
- `npm run test:db` runs the SQL security tests. See [supabase/tests/README.md](supabase/tests/README.md).

## Database

The database lives in a hosted Supabase project named **Stretch**. Its schema is in `supabase/migrations/`. Every change is written there first, then that same SQL is applied to the hosted project through the Supabase connector (`apply_migration`). The file names carry the versions recorded on the hosted project.

### What is in it

| Table | Holds |
|---|---|
| `profiles` | One row per person, created automatically when they sign up. `display_name` is empty until onboarding |
| `prayers` | Prayers and altars, each owned by one person, with an optional plan (target hours, start and end date) |
| `prayer_members` | Who belongs to which prayer, as owner or member |
| `prayer_invites` | The current 8 character invite code for a prayer |
| `prayer_points` | The ordered points of a prayer |
| `scriptures` | The key scriptures of a prayer |
| `prayer_sessions` | The stretches: timed prayer sessions |
| `entries` | Notes and testimonies, personal or shared |

Row level security is on for every table. In short: people can read and change only what belongs to them or to prayers they have joined, and only the owner can change a prayer. Signed-out visitors can call `ping()` and nothing else.

| Function | What it does |
|---|---|
| `ping()` | Returns `ok`. A quick way to check the app can reach the database |
| `create_or_reset_invite(prayer_id)` | Owner only. Creates or replaces the invite code |
| `join_prayer_by_code(code)` | Adds the caller to a prayer as a member |
| `complete_session(...)` | Saves a stretch and an optional note. Under one minute is discarded; credit is capped at 24 hours |
| `get_prayer_hours(prayer_ids)` | The caller's seconds and the group's seconds for prayers they belong to |
| `get_my_hours(since)` | The caller's own seconds since a date, and in total |
| `delete_my_account()` | Deletes the caller's account, their data and the prayers they own |
| `save_prayer(...)` | Creates or updates a prayer with its points and scriptures in one step. Owner only |

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

You should see the sign-in screen. Create an account, enter your name, and you should land on the Pray screen with four tabs along the bottom. The Profile tab shows your name and email.

## Add it to your home screen

**iPhone (Safari):** tap the Share button, then **Add to Home Screen**, then **Add**. It must be Safari; other iPhone browsers may not offer this.

**Android (Chrome):** tap the three-dot menu, then **Add to Home screen** (or **Install app**), then **Install**.

In both cases you should get a forest green icon with a letter S, named Stretch. Opening it should show the app full screen, with no browser address bar, in portrait, with the tab bar clear of the home bar.

## Project layout

```
src/app          routes: (auth) holds sign-in and sign-up; (tabs) holds the four tab screens;
                 (focus) holds full-screen pages: prayers/new, prayers/[id], stretch/[prayerId]
src/components   shared UI: Button, TextField, FormError, TabBar, ConfirmDialog, PageHeader
src/features     code that belongs to one feature: auth, profile, prayers
src/lib          Supabase clients (lib/supabase) and helpers
src/types        database.ts, generated from the schema
supabase/migrations   the schema, security rules and database functions
supabase/tests        SQL tests that prove the security rules
e2e              Playwright tests: sign-in journey, prayers and altars, and the app smoke test
docs             screenshots, and later the prototype
```

Conventions for anyone (or any AI assistant) working here are in [CLAUDE.md](CLAUDE.md). Confirmations always use `src/components/ConfirmDialog`, never `window.confirm` or `window.alert`. Theme tokens (colors, type, spacing, radii) are in `src/app/globals.css`.
