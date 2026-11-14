type Variant = "primary" | "secondary" | "danger" | "quiet" | "quiet-danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white active:brightness-90",
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

/** The same look for a link that should read as a button. */
export function buttonClass(variant: Variant = "primary", className = ""): string {
  return `inline-flex min-h-field w-full items-center justify-center rounded-full px-6 font-semibold transition-colors ${VARIANTS[variant]} ${className}`;
}

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
      className={buttonClass(variant, `disabled:opacity-60 ${className}`)}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
