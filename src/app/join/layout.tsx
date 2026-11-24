/** Invite links: open to everyone, signed in or not, so they sit outside the app's signed-in screens. */
export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-safe pt-safe pb-safe">{children}</main>;
}
