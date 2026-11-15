function Block({ className }: { className: string }) {
  return <div aria-hidden className={`skeleton rounded-control bg-wash ${className}`} />;
}

export function ThanksgivingSkeleton() {
  return (
    <div role="status" aria-label="Loading thanksgivings" className="flex flex-col gap-4">
      <Block className="h-9 w-48" />
      <Block className="h-14 rounded-full" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Block className="h-32 rounded-card" />
        <Block className="h-32 rounded-card" />
        <Block className="h-32 rounded-card" />
      </div>
    </div>
  );
}
