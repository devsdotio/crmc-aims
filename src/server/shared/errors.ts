/**
 * Shared, typed application errors.
 *
 * These are intentionally generic (not asset-specific) so every future
 * module (asset_units, borrow_transactions, assignments, etc.) can reuse
 * them instead of re-inventing error handling per module.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    // Maintains proper stack trace (V8 only, safe no-op elsewhere)
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" was not found.`
      : `${resource} was not found.`;
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly issues?: unknown) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message = "The service is temporarily unavailable. Please try again in a moment."
  ) {
    super(message, 503, "SERVICE_UNAVAILABLE");
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Type guard used by controllers to safely branch on AppError vs
 * unexpected errors without using `any`.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Walk Error.cause chains for DNS / DB connectivity failures. */
export function isConnectivityError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (typeof current !== "object" || current === null) break;

    const code =
      "code" in current && typeof current.code === "string"
        ? current.code
        : "";
    const message =
      current instanceof Error
        ? current.message
        : "message" in current && typeof current.message === "string"
          ? current.message
          : "";

    if (
      /^(ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|UND_ERR_CONNECT_TIMEOUT)$/i.test(
        code
      ) ||
      /getaddrinfo|ENOTFOUND|ECONNREFUSED|connection.*(refused|reset|terminated)|Connect Timeout|Failed query|fetch failed/i.test(
        message
      )
    ) {
      return true;
    }

    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
