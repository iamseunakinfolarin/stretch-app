import Link from "next/link";
import { formatDay } from "@/features/thanksgiving/format";
import { DoneToggle } from "./DoneToggle";
import type { Instruction } from "./types";

/** Instructions, then rituals, as shown on a prayer's page. */
export function InstructionList({ prayerId, items, ended, canEdit }: { prayerId: string; items: Instruction[]; ended: boolean; canEdit: boolean }) {
  const instructions = items.filter((i) => i.kind === "instruction");
  const rituals = items.filter((i) => i.kind === "ritual");
  if (items.length === 0) return <p className="mt-2 text-muted">Nothing written down yet.</p>;

  const who = (item: Instruction) => (!item.isMine && item.authorName ? ` · from ${item.authorName}` : "");
  const open = (item: Instruction, children: React.ReactNode) =>
    item.isMine && canEdit ? (
      <Link href={`/prayers/${prayerId}/instructions/${item.id}`} className="min-w-0 flex-1 py-2">
        {children}
      </Link>
    ) : (
      <div className="min-w-0 flex-1 py-2">{children}</div>
    );

  return (
    <div className="mt-3 flex flex-col gap-5">
      {instructions.length > 0 ? (
        <div>
          <p className="eyebrow text-muted">Instructions</p>
          <ul className="mt-2 flex flex-col gap-2">
            {instructions.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-card border border-hairline bg-surface px-3">
                {item.isMine && canEdit ? (
                  <div className="pt-1">
                    <DoneToggle id={item.id} done={Boolean(item.doneOn)} label={item.body} />
                  </div>
                ) : null}
                {open(
                  item,
                  <>
                    <span className={`block break-words ${item.doneOn ? "text-muted line-through" : "text-ink"}`}>{item.body}</span>
                    <span className="mt-1 block text-caption text-muted">
                      {item.doneOn ? `Done ${formatDay(item.doneOn)}` : `Received ${formatDay(item.receivedOn)}`}
                      {who(item)}
                    </span>
                  </>,
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rituals.length > 0 ? (
        <div>
          <p className="eyebrow text-muted">Rituals</p>
          <ul className="mt-2 flex flex-col gap-2">
            {rituals.map((item) => (
              <li key={item.id} className="flex rounded-card border border-hairline bg-surface px-4">
                {open(
                  item,
                  <>
                    <span className="block break-words text-ink">{item.body}</span>
                    <span className="mt-1 block text-caption text-muted">
                      {ended ? "Ended with this prayer" : item.frequency}
                      {who(item)}
                    </span>
                  </>,
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
