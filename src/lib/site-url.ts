/**
 * The public address of the app, used to build share links.
 * Uses NEXT_PUBLIC_SITE_URL when it is set, otherwise the address the app is open on.
 */
export function getSiteUrl(currentOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = currentOrigin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return (configured || fallback).replace(/\/+$/, "");
}
