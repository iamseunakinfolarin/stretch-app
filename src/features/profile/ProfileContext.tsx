"use client";

import { createContext, useContext } from "react";
import type { CurrentProfile } from "./current-profile";

/** A profile that has finished onboarding: the name is always there. */
export type Profile = Omit<CurrentProfile, "displayName"> & { displayName: string };

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

/** The signed-in person. Available anywhere inside the tabs and the full-screen app routes. */
export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("useProfile must be used inside ProfileGate.");
  return profile;
}
