import { describe, expect, it } from "vitest";

import { homeForRole } from "@/server/shared/roles";

/**
 * Auth login redirect is covered at the pure-helper layer here.
 * Full Supabase sign-in e2e is deferred (see tests/COVERAGE.md).
 */
describe("auth role home (integration scaffold)", () => {
  it("maps roles to workplace dashboards", () => {
    expect(homeForRole("borrower")).toBe("/borrower-db/dashboard");
    expect(homeForRole("admin")).toBe("/dashboard");
    expect(homeForRole("staff")).toBe("/dashboard");
  });
});
