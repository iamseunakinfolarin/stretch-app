// Quiet placeholders shown while a screen's data is on its way.

function Block({ className }: { className: string }) {
  return <div aria-hidden className={`skeleton rounded-control bg-wash ${className}`} />;
}

export function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading your prayers" className="flex flex-col gap-4">
      <Block className="h-4 w-24" />
      <Block className="h-9 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Block className="h-36 rounded-card" />
        <Block className="h-36 rounded-card" />
        <Block className="h-36 rounded-card" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Block className="h-11 w-28" />
      <Block className="h-6 w-20" />
      <Block className="h-9 w-64" />
      <Block className="mt-4 h-24 rounded-card" />
      <Block className="h-40 rounded-card" />
    </div>
  );
}
