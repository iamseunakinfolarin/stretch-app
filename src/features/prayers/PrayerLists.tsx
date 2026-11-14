"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/Button";
import { EmptyState } from "./EmptyState";
import { formatHours, formatPlan } from "./format";
import { isArchived, type PrayerSummary } from "./types";

type ListKey = "prayers" | "altars" | "archived";

const EMPTY: Record<ListKey, { title: string; body: string; create?: string }> = {
  prayers: {
    title: "No prayers yet",
    body: "A prayer is something specific you are asking for. Add one and it will wait for you here.",
    create: "Create a prayer",
  },
  altars: {
    title: "No altars yet",
    body: "An altar is a long-term prayer you return to again and again.",
    create: "Create an altar",
  },
  archived: {
    title: "Nothing archived",
    body: "Prayers and altars you set aside rest here, with everything they hold.",
  },
};

/** My Prayers: three lists behind three visible buttons, one shown at a time. */
export function PrayerLists({ prayers }: { prayers: PrayerSummary[] }) {
  const [selected, setSelected] = useState<ListKey>("prayers");

  const lists: Record<ListKey, PrayerSummary[]> = {
    prayers: prayers.filter((p) => p.kind === "prayer" && !isArchived(p)),
    altars: prayers.filter((p) => p.kind === "altar" && !isArchived(p)),
    archived: prayers.filter(isArchived),
  };
  const tabs: { key: ListKey; label: string }[] = [
    { key: "prayers", label: "Prayers" },
    { key: "altars", label: "Altars" },
    { key: "archived", label: "Archived" },
  ];
  const shown = lists[selected];
  const empty = EMPTY[selected];

  return (
    <div>
      <div role="group" aria-label="Which list to show" className="grid grid-cols-3 gap-1 rounded-full bg-wash p-1">
        {tabs.map((tab) => {
          const active = tab.key === selected;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(tab.key)}
              className={`min-h-tap rounded-full px-2 text-caption font-semibold ${
                active ? "bg-surface text-forest shadow-card" : "text-muted"
              }`}
            >
              {tab.label} <span className="tabular-nums">({lists[tab.key].length})</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {shown.length === 0 ? (
          <EmptyState
            title={empty.title}
            action={
              empty.create ? (
                <Link href="/prayers/new" className={buttonClass("primary")}>
                  {empty.create}
                </Link>
              ) : undefined
            }
          >
            {empty.body}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((prayer) => {
              const plan = formatPlan(prayer);
              return (
                <li key={prayer.id}>
                  <Link
                    href={`/prayers/${prayer.id}`}
                    className="flex min-h-tap items-center gap-4 rounded-card border border-hairline bg-surface px-5 py-4 shadow-card active:bg-wash"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold break-words text-forest">{prayer.title}</span>
                      <span className="mt-1 block text-caption text-muted">
                        {selected === "archived" ? `${prayer.kind === "altar" ? "Altar" : "Prayer"} · ` : ""}
                        {plan ?? "No plan set"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold text-ink">{formatHours(prayer.mySeconds)}</span>
                      <span className="block text-caption text-muted">prayed</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
