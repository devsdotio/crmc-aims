import { describe, expect, it } from "vitest";

import {
  APP_ROLES,
  ROLE_RANK,
  assignableRolesFor,
  hasMinRole,
  homeForRole,
  isAssetOperatorRole,
  isStaffShellRole,
  isUserManagerRole,
} from "@/server/shared/roles";

describe("roles", () => {
  it("defines the four application roles", () => {
    expect(APP_ROLES).toEqual(["superadmin", "admin", "staff", "borrower"]);
  });

  it("ranks privilege correctly", () => {
    expect(ROLE_RANK.superadmin).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.staff);
    expect(ROLE_RANK.staff).toBeGreaterThan(ROLE_RANK.borrower);
    expect(hasMinRole("admin", "staff")).toBe(true);
    expect(hasMinRole("staff", "admin")).toBe(false);
  });

  it("treats staff as shell-only, not asset operators", () => {
    expect(isStaffShellRole("staff")).toBe(true);
    expect(isAssetOperatorRole("staff")).toBe(false);
    expect(isAssetOperatorRole("admin")).toBe(true);
    expect(isUserManagerRole("admin")).toBe(true);
    expect(isUserManagerRole("staff")).toBe(false);
  });

  it("limits assignable roles by actor", () => {
    expect(assignableRolesFor("superadmin")).toEqual([
      "admin",
      "staff",
      "borrower",
    ]);
    expect(assignableRolesFor("admin")).toEqual(["staff", "borrower"]);
    expect(assignableRolesFor("staff")).toEqual([]);
  });

  it("routes roles to the correct workplace home", () => {
    expect(homeForRole("borrower")).toBe("/borrower-db/dashboard");
    expect(homeForRole("admin")).toBe("/dashboard");
    expect(homeForRole("superadmin")).toBe("/dashboard");
    expect(homeForRole("staff")).toBe("/dashboard");
  });
});
