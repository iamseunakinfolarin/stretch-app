export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header>
      {eyebrow ? (
        <p className="text-caption font-semibold tracking-[0.14em] text-gold uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 font-serif text-title text-ink">{title}</h1>
      {children ? <p className="mt-3 text-muted">{children}</p> : null}
    </header>
  );
}
