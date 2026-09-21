/**
 * Human-readable relative time for activity stamps (client + server).
 */
export function formatRelativeTime(
  value: Date | string | null | undefined,
  nowMs: number = Date.now()
): string {
  if (value == null) return "Never";

  const date = typeof value === "string" ? new Date(value) : value;
  const ms = date.getTime();
  if (Number.isNaN(ms)) return "—";

  const diffMs = nowMs - ms;
  if (diffMs < 0) return "Just now";

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "Active now";
  if (sec < 90) return "1 minute ago";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minutes ago`;

  const hr = Math.floor(min / 60);
  if (hr === 1) return "1 hour ago";
  if (hr < 24) return `${hr} hours ago`;

  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Whole calendar days from today until `dueDate` (YYYY-MM-DD). Negative if past. */
export function calendarDaysUntil(
  dueDate: string,
  now: Date = new Date()
): number {
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
