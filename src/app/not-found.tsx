import Link from "next/link";
import { buttonClass } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-safe pt-safe pb-safe text-center">
      <p className="eyebrow text-primary">Not found</p>
      <h1 className="mt-2 text-title font-bold text-forest">We couldn&apos;t find that page</h1>
      <p className="mx-auto mt-3 max-w-xs text-muted">The address may be mistyped, or the page may have moved.</p>
      <Link href="/" className={buttonClass("primary", "mt-8")}>
        Go to Pray
      </Link>
    </main>
  );
}
