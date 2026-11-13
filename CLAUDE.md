# Stretch

Mobile-first prayer PWA. Next.js App Router, TypeScript strict, Tailwind, Supabase.

## Rules
- Never use or store the Supabase secret key, service_role key or database password.
  Only NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL.
- Every schema change is a file in supabase/migrations first, then that same SQL is applied.
- RLS is the gate. Every table has RLS on. New functions set an empty search_path.
- Functions that only serve RLS policies live in the `private` schema, outside the API.
  Only functions the app calls go in `public`. Use SECURITY DEFINER only where it is needed.
- Regenerate src/types/database.ts from the hosted project (Supabase MCP generate_typescript_types)
  after any schema change. The hosted project is named Stretch; never touch another project.
- No window.confirm or window.alert. Use src/components/ConfirmDialog.
- Forms: use Button, TextField and FormError from src/components. A submit button stays disabled
  until useHydrated() is true, and the form has method="post", so typed values never reach the URL.
- Errors shown to people come from src/features/auth/messages.ts, never raw error text.
- Screens inside the app are wrapped in ProfileGate (signed in and named). Read the signed-in
  person with useProfile() in client components or getCurrentProfile() on the server.
- Phone first: design at 390px. Tap targets >= 44px, inputs >= 16px, scripture >= 18px,
  safe-area padding. Light theme only. Theme tokens live in src/app/globals.css.
  Type: font-serif for titles and scripture, font-sans for reading, the label-mono utility for small labels.
- Work on a phase branch, never directly on main. Do not merge pull requests.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npx tsc --noEmit`
- `npm test` (Vitest), `npm run test:e2e` (Playwright, needs `npm run db:start`), `npm run test:db` (SQL tests)
- `npm run gen:types`

## Layout
- `src/app` routes, `src/components` shared UI, `src/features` per-feature code
- `src/lib` clients and helpers, `src/types` generated and shared types
- `supabase/migrations`, `supabase/tests`, `docs`
