import { describe, expect, it } from "vitest";

import {
  appErrorFromUnknown,
  ConflictError,
  isConnectivityError,
  ServiceUnavailableError,
} from "@/server/shared/errors";
import { formatFriendlyNetworkError } from "@/lib/network-error";

function drizzleFailedQuery(cause: { code?: string; message?: string }) {
  const err = new Error(
    `Failed query: insert into "categories" ("name") values ($1)`
  );
  (err as Error & { cause: unknown }).cause = cause;
  return err;
}

describe("isConnectivityError / appErrorFromUnknown", () => {
  it("does not treat Postgres unique violations as connectivity", () => {
    const err = drizzleFailedQuery({
      code: "23505",
      message: 'duplicate key value violates unique constraint "categories_tenant_type_name_lower_uidx"',
    });
    expect(isConnectivityError(err)).toBe(false);
    const mapped = appErrorFromUnknown(err);
    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped?.statusCode).toBe(409);
  });

  it("does not treat missing-column errors as connectivity", () => {
    const err = drizzleFailedQuery({
      code: "42703",
      message: 'column "category_class" does not exist',
    });
    expect(isConnectivityError(err)).toBe(false);
    const mapped = appErrorFromUnknown(err);
    expect(mapped).toBeInstanceOf(ServiceUnavailableError);
    expect(mapped?.message).toMatch(/schema is out of date/i);
  });

  it("still detects real network/DNS failures", () => {
    const dns = new Error("getaddrinfo ENOTFOUND db.example.supabase.co");
    (dns as Error & { code: string }).code = "ENOTFOUND";
    expect(isConnectivityError(dns)).toBe(true);

    const reset = new Error("read ECONNRESET");
    (reset as Error & { code: string }).code = "ECONNRESET";
    expect(isConnectivityError(reset)).toBe(true);
  });

  it("treats bare Failed query without SQLSTATE as connectivity (unknown infra)", () => {
    expect(isConnectivityError(new Error("Failed query: select 1"))).toBe(true);
  });
});

describe("formatFriendlyNetworkError", () => {
  it("keeps duplicate-name / schema messages instead of high-load copy", () => {
    expect(
      formatFriendlyNetworkError(
        new Error('Category “Stationery” already exists for this type.')
      )
    ).toMatch(/already exists/i);

    expect(
      formatFriendlyNetworkError(
        new Error(
          "The database schema is out of date. Ask an admin to run migrations, then retry."
        )
      )
    ).toMatch(/schema is out of date/i);
  });

  it("maps opaque unreachable-database copy to high-load guidance", () => {
    expect(
      formatFriendlyNetworkError(
        new Error(
          "We couldn’t reach the database. Check your connection and try again shortly."
        )
      )
    ).toMatch(/high load/i);
  });
});
