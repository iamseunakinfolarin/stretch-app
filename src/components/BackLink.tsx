import Link from "next/link";

/** The "back" link at the top of a full-screen page. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-ml-2 inline-flex min-h-tap items-center self-start rounded-full px-2 font-semibold text-primary">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mr-1">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {children}
    </Link>
  );
}
