type Variant = "primary" | "secondary" | "danger" | "quiet" | "quiet-danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white active:bg-primary-deep",
  secondary: "border border-hairline bg-surface text-ink active:bg-wash",
  danger: "bg-danger text-white active:opacity-90",
  quiet: "text-primary active:bg-wash",
  "quiet-danger": "text-danger active:bg-danger/10",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Shows the working label and blocks a second tap while an action runs. */
  busy?: boolean;
  busyLabel?: string;
};

/** The app's button. Always at least 44px tall; the main variants are 52px. */
export function Button({
  variant = "primary",
  busy = false,
  busyLabel,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-field w-full items-center justify-center rounded-control px-5 font-semibold transition-colors disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
