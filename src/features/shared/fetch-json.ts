/**
 * Shared authenticated fetch for feature client APIs.
 * Response envelope: `{ data: T }` / error `{ error: string }`.
 */

type ApiResponse<T> = { data: T };
type PaginatedResponse<T> = {
  data: T;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    counts?: Record<string, number>;
  };
};
type ApiErrorResponse = { error?: string };

/** Client-side abort so a hung Next API / DB path cannot spin skeletons forever. */
const DEFAULT_TIMEOUT_MS = 25_000;

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _timeoutMs, signal: externalSignal, ...restInit } =
    init ?? {};
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onAbort);

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Avoid browser HTTP cache / 304 empty bodies for JSON APIs that use ETag.
    // A 304 has no body, and returning undefined corrupts React Query consumers
    // (e.g. empty department dropdowns after the first successful load).
    const response = await fetch(input, {
      ...restInit,
      cache: restInit.cache ?? "no-store",
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(restInit.headers ?? {}),
      },
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as ApiErrorResponse;
        if (payload.error) message = payload.error;
      } catch {
        // keep generic
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    // 304 should not occur with cache: "no-store"; if it does, fail clearly
    // instead of returning undefined and breaking callers that expect `.data`.
    if (response.status === 304) {
      throw new Error("Stale cache response (304). Please retry.");
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Request timed out. Check your connection or try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onAbort);
  }
}

export type { ApiResponse, PaginatedResponse };
