"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/Button";
import { formatClock } from "./clock";

/**
 * "Still praying?" It cannot be dismissed with Escape or by tapping outside: it either gets an
 * answer or runs out of time, and running out of time pauses the clock.
 */
export function CheckInDialog({ open, remainingMs, onConfirm }: { open: boolean; remainingMs: number; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="check-in-title"
      aria-describedby="check-in-description"
      onCancel={(event) => event.preventDefault()}
      className="m-auto w-[min(92vw,24rem)] rounded-card border border-hairline bg-surface p-6 text-ink shadow-card backdrop:bg-forest/40"
    >
      <p className="eyebrow text-muted">Check-in</p>
      <h2 id="check-in-title" className="mt-1 text-title font-bold text-forest">
        Still praying?
      </h2>
      <p id="check-in-description" className="mt-2 text-muted">
        Tap below to keep your clock running. If we don&apos;t hear from you, it will pause.
      </p>
      <p role="timer" aria-label="Time left to answer" className="mt-4 text-heading font-bold text-primary tabular-nums">
        {formatClock(Math.ceil(remainingMs / 1000))}
      </p>
      <div className="mt-5">
        <Button onClick={onConfirm}>Yes, I&apos;m still praying</Button>
      </div>
    </dialog>
  );
}
