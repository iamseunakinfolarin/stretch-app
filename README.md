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

The schema lives in `supabase/migrations/`. Every change is written there first, then that same SQL is applied to the hosted Supabase project (named **Stretch**) through the Supabase MCP `apply_migration` tool. The file names carry the versions recorded on the hosted project.

`src/types/database.ts` is generated from the hosted project's live schema with the Supabase MCP `generate_typescript_types` tool; do not edit it by hand. `npm run gen:types` produces the same types from the local database, which is useful while a migration is still in progress.

Local database for development and tests (needs Docker):

```bash
npm run db:start
```

```bash
npm run db:reset
```

`db:reset` rebuilds the local database from the migration files. To use the local database from the app, set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the publishable key printed by `npx supabase status`.

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
