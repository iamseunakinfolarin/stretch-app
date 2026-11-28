"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { dataErrorMessage } from "@/features/auth/messages";
import { today } from "@/features/thanksgiving/format";
import { setDone } from "./mutations";

/** The round tick beside one of your instructions: done today, or not done. */
export function DoneToggle({ id, done, label }: { id: string; done: boolean; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await setDone(id, done ? null : today());
      router.refresh();
    } catch (cause) {
      setError(dataErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Done: ${label}`}
        disabled={busy}
        onClick={() => void toggle()}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        <span
          aria-hidden
          className={`inline-flex size-6 items-center justify-center rounded-full border-2 ${done ? "border-forest bg-forest text-white" : "border-hairline bg-surface"}`}
        >
          {done ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          ) : null}
        </span>
      </button>
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}
