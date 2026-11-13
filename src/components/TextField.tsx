"use client";

import { useId } from "react";

export type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  /** Shown under the field in red, and announced to screen readers. */
  error?: string | null;
  /** Quiet helper text under the field. Hidden while an error shows. */
  hint?: string;
};

/** A labelled text input. 16px text so iPhone does not zoom, 52px tall for an easy tap. */
export function TextField({ label, error, hint, className = "", ...rest }: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <div className={className}>
      <label htmlFor={id} className="label-mono block text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`mt-2 block h-field w-full rounded-control border bg-surface px-4 text-ink placeholder:text-muted/70 ${
          error ? "border-danger" : "border-hairline"
        }`}
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
