import type { FinishedStretch, Stretch } from "./clock";

// A stretch lives on the phone while it runs, and a finished one waits here until it is saved.
// Both survive a closed tab, a locked screen and a dropped connection.

const ACTIVE_KEY = "stretch:active";
const PENDING_KEY = "stretch:pending";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked. The stretch carries on in memory.
  }
}

function isStretch(value: unknown): value is Stretch {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.prayerId === "string" &&
    typeof s.prayerTitle === "string" &&
    typeof s.startedAt === "number" &&
    typeof s.pausedTotalMs === "number" &&
    typeof s.nextCheckInAtActiveMs === "number"
  );
}

function isFinished(value: unknown): value is FinishedStretch {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.prayerId === "string" &&
    typeof f.startedAt === "number" &&
    typeof f.endedAt === "number" &&
    typeof f.creditedSeconds === "number"
  );
}

/** The stretch in progress on this phone, if there is one. */
export function loadActiveStretch(): Stretch | null {
  const value = read<unknown>(ACTIVE_KEY);
  return isStretch(value) ? value : null;
}

export function saveActiveStretch(stretch: Stretch | null) {
  write(ACTIVE_KEY, stretch);
}

/** Finished stretches that have not reached the database yet. */
export function loadPending(): FinishedStretch[] {
  const value = read<unknown[]>(PENDING_KEY);
  return Array.isArray(value) ? value.filter(isFinished) : [];
}

export function addPending(finished: FinishedStretch) {
  const others = loadPending().filter((p) => p.id !== finished.id);
  write(PENDING_KEY, [...others, finished]);
}

export function removePending(id: string) {
  const rest = loadPending().filter((p) => p.id !== id);
  write(PENDING_KEY, rest.length > 0 ? rest : null);
}
