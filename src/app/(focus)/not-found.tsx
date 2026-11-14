import Link from "next/link";
import { buttonClass } from "@/components/Button";

/** Shown for a prayer that does not exist, or that is not yours to see. The two look the same on purpose. */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col justify-center text-center">
      <p className="eyebrow text-primary">Not found</p>
      <h1 className="mt-2 text-title font-bold text-forest">We couldn&apos;t find that</h1>
      <p className="mx-auto mt-3 max-w-xs text-muted">
        It may have been deleted, or it may not be yours to see.
      </p>
      <Link href="/prayers" className={buttonClass("primary", "mt-8")}>
        Go to My Prayers
      </Link>
    </div>
  );
}
