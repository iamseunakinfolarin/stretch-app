import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile } from "./current-profile";
import { ProfileProvider } from "./ProfileContext";

async function Gate({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  // Nobody uses the app without a name: onboarding comes first.
  if (!profile.displayName) redirect("/welcome");
  return <ProfileProvider profile={{ ...profile, displayName: profile.displayName }}>{children}</ProfileProvider>;
}

/**
 * Wraps every screen that needs a signed-in, onboarded person.
 * The session is read at request time, so the content streams in behind a Suspense boundary.
 */
export function ProfileGate({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
