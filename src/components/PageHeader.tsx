export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header>
      {eyebrow ? <p className="eyebrow text-primary">{eyebrow}</p> : null}
      <h1 className="mt-2 text-title font-bold text-forest">{title}</h1>
      {children ? <p className="mt-3 text-muted">{children}</p> : null}
    </header>
  );
}
