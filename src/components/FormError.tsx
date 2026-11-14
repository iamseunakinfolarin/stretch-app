/** A form-level message, announced as soon as it appears. Renders nothing when there is no message. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-caption text-danger">
      {message}
    </p>
  );
}
