import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError, type ZodIssue } from "zod";

import { isAppError, isConnectivityError, ServiceUnavailableError } from "./errors";

export interface CacheControlOptions {
  maxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
}

/**
 * Success envelope used by the frontend assets client:
 * `src/features/assets/client/assets-api.ts` → `{ data: T }`.
 *
 * Keep this shape stable so hooks integrate without client changes.
 * Structured `success`/`code` can be layered on later without dropping `data`.
 */
export function ok<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status, headers });
}

/**
 * JSON success envelope with ETag + Cache-Control validators.
 *
 * Always returns the full body. A bare 304 (empty body) breaks `fetchJson`
 * consumers — browsers still send `If-None-Match` for these private API GETs,
 * and an empty 304 was surfacing as empty department / supplier dropdowns.
 */
export function okWithEtag<T>(
  request: Request,
  data: T,
  options?: {
    status?: number;
    cacheControl?: CacheControlOptions;
  }
) {
  void request;
  const bodyString = JSON.stringify({ data });
  const hash = createHash("sha1").update(bodyString).digest("hex");
  const etag = `W/"${hash}"`;

  const cacheControlDirectives = [
    options?.cacheControl?.private !== false ? "private" : "public",
    options?.cacheControl?.maxAge !== undefined
      ? `max-age=${options.cacheControl.maxAge}`
      : "no-cache",
    options?.cacheControl?.staleWhileRevalidate !== undefined
      ? `stale-while-revalidate=${options.cacheControl.staleWhileRevalidate}`
      : "stale-while-revalidate=60",
  ].join(", ");

  const headers = new Headers({
    "Content-Type": "application/json",
    ETag: etag,
    "Cache-Control": cacheControlDirectives,
  });

  return new NextResponse(bodyString, {
    status: options?.status ?? 200,
    headers,
  });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

function formatZodIssue(issue?: ZodIssue): string {
  if (!issue) return "Invalid request data. Please check your inputs.";

  const path = issue.path.join(".");
  const message = issue.message;

  // Handle UUID validation errors
  if (
    message.toLowerCase().includes("uuid") ||
    (issue.code === "invalid_format" && (issue as { format?: string }).format === "uuid")
  ) {
    if (path.includes("asset")) return "The selected equipment or asset could not be found. Please re-select the item.";
    if (path.includes("department")) return "Your account is not linked to a valid department. Please contact a Property Custodian.";
    if (path.includes("consumable")) return "The selected supply item could not be found. Please re-select the item.";
    if (path.includes("user") || path.includes("requester")) return "Your user session is invalid. Please sign in again.";
    return "A selected item identifier is invalid. Please refresh the page and try again.";
  }

  // Handle date errors
  if (path.toLowerCase().includes("date") || message.toLowerCase().includes("date")) {
    if (path.includes("expectedReturnDate") || path.includes("dateTo")) {
      return "Please select a valid expected return date for your request.";
    }
    return "Please provide a valid date.";
  }

  // Handle required or missing fields
  if (message.toLowerCase().includes("required") || message.toLowerCase().includes("at least 1 character")) {
    const fieldName = path.split(".").pop() || "field";
    const humanField = fieldName.replace(/([A-Z])/g, " $1").toLowerCase();
    return `Please fill in the ${humanField} field.`;
  }

  // Fallback to custom message if clean, otherwise generic friendly message
  if (
    message &&
    !message.startsWith("Expected ") &&
    !message.startsWith("Invalid input") &&
    !message.startsWith("Invalid literal")
  ) {
    return message;
  }

  return "Some required details were missing or formatted incorrectly. Please review your submission.";
}

/**
 * Error envelope used by the frontend assets client → `{ error: string }`.
 */
export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = formatZodIssue(firstIssue);

    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (isAppError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (isConnectivityError(error)) {
    console.error("Connectivity error:", error);
    const unavailable = new ServiceUnavailableError(
      "We couldn’t reach the database. Check your connection and try again shortly."
    );
    return NextResponse.json(
      { error: unavailable.message },
      { status: unavailable.statusCode }
    );
  }

  console.error("Unhandled error:", error);

  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again or contact support." },
    { status: 500 }
  );
}
