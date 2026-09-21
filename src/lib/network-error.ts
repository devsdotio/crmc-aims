/**
 * Formats low-level HTTP/fetch/network errors into clear, friendly, and actionable user notices.
 */

const AUTH_ERROR_PATTERN =
  /authentication required|unauthorized|session expired|jwt expired|\b401\b/i;

export function isAuthNetworkError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error || "");
  return AUTH_ERROR_PATTERN.test(raw);
}

export function formatFriendlyNetworkError(
  error: unknown,
  fallbackMessage?: string
): string {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !navigator.onLine
  ) {
    return "You appear to be offline. Please check your internet connection and try again.";
  }

  const raw = error instanceof Error ? error.message : String(error || "");

  if (
    /failed to fetch/i.test(raw) ||
    /networkerror/i.test(raw) ||
    /load failed/i.test(raw) ||
    /econnrefused/i.test(raw) ||
    /fetch failed/i.test(raw) ||
    /err_connection/i.test(raw) ||
    /network request failed/i.test(raw)
  ) {
    return "Unable to connect to the server. Please check your internet connection or try again shortly.";
  }

  if (AUTH_ERROR_PATTERN.test(raw)) {
    return "Your session has ended. Sign in again to continue.";
  }

  if (/forbidden|permission denied|403/i.test(raw)) {
    return "You do not have permission to view or perform this action.";
  }

  if (/timeout|timed out|abort/i.test(raw)) {
    return "It looks like your internet connection is unstable. Please check your connection and try again.";
  }

  if (/database|supabase|500|502|503|internal server/i.test(raw)) {
    return "The server is temporarily experiencing high load. Please try again in a few moments.";
  }

  if (
    raw &&
    raw !== "Error" &&
    raw !== "NetworkError" &&
    raw.length > 3 &&
    raw.length < 130 &&
    !raw.includes("<!DOCTYPE") &&
    !raw.includes("<html>") &&
    !raw.includes("{") &&
    !raw.includes("webpack")
  ) {
    return raw;
  }

  return (
    fallbackMessage ||
    "Unable to complete request due to a network error. Please try again."
  );
}
