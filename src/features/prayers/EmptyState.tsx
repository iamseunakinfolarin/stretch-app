/** A calm, plain prompt for a screen or list with nothing in it yet. */
export function EmptyState({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-hairline bg-surface/60 px-6 py-10 text-center">
      <h2 className="text-heading font-bold text-forest">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-muted">{children}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
