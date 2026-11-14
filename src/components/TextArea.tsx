"use client";

import { useId } from "react";

export type TextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  /** Keeps the label for screen readers only, when a visible heading already names the field. */
  hideLabel?: boolean;
  error?: string | null;
  hint?: string;
};

/** A labelled multi-line input, styled like TextField. 16px text so iPhone does not zoom. */
export function TextArea({ label, hideLabel = false, error, hint, className = "", rows = 2, ...rest }: TextAreaProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "eyebrow block text-muted"}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`block w-full resize-none rounded-control border bg-surface px-4 py-3 text-ink placeholder:text-muted/70 ${
          hideLabel ? "" : "mt-2"
        } ${error ? "border-danger" : "border-hairline"}`}
        {...rest}
      />
      {message ? (
        <p id={messageId} className={`mt-2 text-caption ${error ? "text-danger" : "text-muted"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
