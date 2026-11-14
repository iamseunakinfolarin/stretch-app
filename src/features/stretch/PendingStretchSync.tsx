"use client";

import { useEffect } from "react";
import { flushPendingStretches } from "./mutations";

/** Saves any finished stretch still waiting on this phone, whenever the app opens or comes back online. */
export function PendingStretchSync() {
  useEffect(() => {
    void flushPendingStretches();
    const onOnline = () => void flushPendingStretches();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
