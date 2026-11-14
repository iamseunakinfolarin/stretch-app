import Link from "next/link";
import { ProfileGate } from "@/features/profile/ProfileGate";

/** Layout for screens that sit outside the tab bar and fill the whole phone. */
export function FullScreenPlaceholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-safe pt-safe pb-safe">
      <Link href="/prayers" className="-ml-2 inline-flex min-h-tap items-center self-start px-2 font-medium text-primary">
        <span aria-hidden className="mr-1">
          ←
        </span>
        Back
      </Link>
      <ProfileGate>
        <h1 className="mt-4 text-title font-bold text-forest">{title}</h1>
        <p className="mt-3 text-muted">{children}</p>
      </ProfileGate>
    </main>
  );
}
