import "server-only";
import { cookies } from "next/headers";

import { TIME_ZONE_COOKIE } from "./time-zone-name";

/** The browser's time zone from its cookie, or UTC when it is missing or not a real zone. */
export async function getTimeZone(): Promise<string> {
  const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}
