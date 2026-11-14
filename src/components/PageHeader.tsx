export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header>
      {eyebrow ? <p className="label-mono text-primary">{eyebrow}</p> : null}
      <h1 className="mt-2 font-serif text-title text-ink">{title}</h1>
      {children ? <p className="mt-3 text-muted">{children}</p> : null}
    </header>
  );
}
