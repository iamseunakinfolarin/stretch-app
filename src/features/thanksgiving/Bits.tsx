import Link from "next/link";
import { glowStyle } from "./glow";
import { countLabel, formatDay } from "./format";
import type { Glow, Thanksgiving } from "./types";

/** The big call to action at the top of the Thanksgiving page. */
export function StartLink({ children = "Start documenting God's goodness" }: { children?: React.ReactNode }) {
  return (
    <Link
      href="/thanksgiving/new"
      className="bg-brand inline-flex min-h-field w-full items-center justify-center rounded-full px-6 font-semibold text-white shadow-card active:brightness-90"
    >
      {children}
    </Link>
  );
}

/** A glowing card for one category (or for the thanksgivings with none). */
export function CategoryCard({ href, name, glow, count }: { href: string; name: string; glow: Glow; count: number }) {
  return (
    <Link href={href} style={glowStyle(glow)} className="glow-card flex min-h-32 flex-col rounded-card p-4 active:brightness-95">
      <span className="line-clamp-2 font-bold break-words text-forest">{name}</span>
      <span className="mt-auto pt-3 text-caption text-muted">
        <span className="font-bold text-ink tabular-nums">{count}</span> {count === 1 ? "thanksgiving" : "thanksgivings"}
      </span>
    </Link>
  );
}

export { countLabel };

/** One thanksgiving in a list. */
export function ThanksgivingItem({ item, showCategory = true }: { item: Thanksgiving; showCategory?: boolean }) {
  return (
    <Link
      href={`/thanksgiving/${item.id}`}
      style={glowStyle(item.glow)}
      className="glow-card block rounded-card px-5 py-4 active:brightness-95"
    >
      <span className="block font-bold break-words text-forest">{item.title}</span>
      <span className="mt-1 line-clamp-2 block text-muted">{item.body}</span>
      <span className="mt-2 flex flex-wrap items-center gap-x-2 text-caption text-muted">
        <span>{formatDay(item.happenedOn)}</span>
        {showCategory && item.categoryName ? <span>· {item.categoryName}</span> : null}
        {!item.isMine && item.authorName ? <span>· from {item.authorName}</span> : null}
      </span>
    </Link>
  );
}
