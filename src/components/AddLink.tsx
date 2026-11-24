import Link from "next/link";

/** The small "Add" link on the right of a section heading. `label` is what a screen reader hears. */
export function AddLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="inline-flex min-h-field items-center gap-1 px-2 font-semibold text-primary">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add
    </Link>
  );
}
