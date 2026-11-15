/** "14 Nov 2026". Days are calendar days, read as UTC so they never shift by a timezone. */
export function formatDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Today as YYYY-MM-DD in the browser's own time zone, for the date field. */
export function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function countLabel(count: number): string {
  return `${count} ${count === 1 ? "thanksgiving" : "thanksgivings"}`;
}
