/** Sign-in and sign-up: full screen, no tab bar, the wordmark on top. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-safe pt-safe pb-safe">
      <p className="font-serif text-[2rem] leading-none text-ink" aria-hidden>
        Stretch
      </p>
      <p className="label-mono mt-3 text-muted">Pray deliberately. Keep the hours.</p>
      <div className="mt-12 flex-1">{children}</div>
    </main>
  );
}
