"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "./time-zone-name";

/** Tells the server the browser's time zone, so weeks start on Sunday where the person is. */
export function TimeZoneCookie() {
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone) document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // The server falls back to UTC.
    }
  }, []);
  return null;
}
