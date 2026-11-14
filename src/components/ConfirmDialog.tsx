"use client";

import { useEffect, useId, useRef } from "react";

export type ConfirmDialogProps = {
  /** Whether the dialog is showing. The parent owns this state. */
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" styles the confirm button for destructive actions such as delete or leave. */
  tone?: "default" | "danger";
  /** Disables both buttons while the confirmed action is running. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The one confirmation modal for the whole app. Use it instead of window.confirm or window.alert.
 * Built on the native <dialog>, which traps focus, closes on Escape and makes the page behind inert.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const confirmTone =
    tone === "danger" ? "bg-danger text-white active:opacity-90" : "bg-primary text-white active:bg-primary-deep";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape fires "cancel". Keep the parent in charge of the open state.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      // A tap on the dimmed backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-card bg-surface p-0 text-ink shadow-dialog"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-heading font-bold">
          {title}
        </h2>
        {description ? (
          <div id={descriptionId} className="mt-2 text-muted">
            {description}
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`min-h-tap rounded-control px-4 font-semibold disabled:opacity-60 ${confirmTone}`}
          >
            {confirmLabel}
          </button>
          {/* Cancel is the safe choice, so it takes focus when the dialog opens. */}
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onCancel}
            className="min-h-tap rounded-control border border-hairline px-4 font-semibold text-ink disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
