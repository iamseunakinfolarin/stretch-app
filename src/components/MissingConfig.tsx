/** Shown instead of the app when the Supabase environment variables are not set. */
export function MissingConfig({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-safe pt-safe pb-safe">
      <p className="label-mono text-primary">Setup needed</p>
      <h1 className="mt-2 font-serif text-title text-ink">Stretch is not connected yet</h1>
      <p className="mt-4 text-muted">
        The app cannot reach its database because {missing.length === 1 ? "this setting is" : "these settings are"}{" "}
        missing:
      </p>
      <ul className="mt-4 space-y-2">
        {missing.map((name) => (
          <li
            key={name}
            className="rounded-control border border-hairline bg-surface px-4 py-3 font-mono text-[0.875rem] break-all text-ink"
          >
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-muted">
        Add {missing.length === 1 ? "it" : "them"} to <span className="font-mono text-[0.875rem]">.env.local</span> on
        your computer, or to the project&apos;s environment variables in Vercel, then restart or redeploy.
      </p>
    </main>
  );
}
