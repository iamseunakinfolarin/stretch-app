import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile } from "@/features/profile/current-profile";
import { DisplayNameForm } from "@/features/profile/DisplayNameForm";

// These screens read the session and may redirect, so they render at request time.
// This opts them out of Next's instant-navigation check, as its auth guide describes.
export const instant = false;

export const metadata: Metadata = { title: "Welcome" };

async function Onboarding() {
  const profile = await getCurrentProfile();
  // Already has a name: onboarding is done.
  if (profile.displayName) redirect("/");
  return <DisplayNameForm userId={profile.id} submitLabel="Continue" redirectTo="/" />;
}

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-safe pt-safe pb-safe">
      <p className="eyebrow text-primary">Welcome to Stretch</p>
      <h1 className="mt-2 text-title font-bold text-forest">What should we call you?</h1>
      <p className="mt-3 mb-8 text-muted">One small thing before you begin.</p>
      <Suspense fallback={null}>
        <Onboarding />
      </Suspense>
    </main>
  );
}
