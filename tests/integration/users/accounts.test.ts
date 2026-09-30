import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { getDb } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { UserService } from "@/server/modules/users/user.service";
import { hasTestDatabase } from "../../setup/env";
import { resetTestDatabase } from "../../setup/db";
import { seedCoreFixtures, type TestFixtures } from "../../setup/fixtures";

const describeIntegration = hasTestDatabase ? describe : describe.skip;

describeIntegration("users / department accounts", () => {
  const users = new UserService();
  let fx: TestFixtures;
  let staffUserId: string;

  beforeEach(async () => {
    await resetTestDatabase();
    fx = await seedCoreFixtures();

    // Auth user creation needs Supabase admin — seed a profile row instead.
    staffUserId = randomUUID();
    await getDb().insert(profiles).values({
      userId: staffUserId,
      tenantId: fx.actor.tenantId,
      email: "staff.ops@test.local",
      fullName: "Staff Operator",
      role: "staff",
      status: "active",
      createdByUserId: fx.actor.userId,
    });
  });

  it("lists accounts and can update / deactivate a department-scoped user", async () => {
    const listed = await users.listUsersForActor(fx.actor, {});
    const staff = listed.find((u) => u.id === staffUserId);
    const borrower = listed.find((u) => u.id === fx.borrower.userId);
    expect(staff).toBeTruthy();
    expect(staff!.email).toBe("staff.ops@test.local");
    expect(staff!.name).toBe("Staff Operator");
    expect(staff!.role).toBe("staff");
    expect(staff!.status).toBe("active");
    expect(borrower).toBeTruthy();
    expect(borrower!.role).toBe("borrower");
    expect(borrower!.status).toBe("active");

    const updated = await users.updateUser(
      staffUserId,
      { name: "Staff Ops Updated" },
      fx.actor
    );
    expect(updated.name).toBe("Staff Ops Updated");
    expect(updated.role).toBe("staff");
    expect(updated.status).toBe("active");
    expect(updated.email).toBe("staff.ops@test.local");

    const deactivated = await users.deactivateUser(staffUserId, fx.actor);
    expect(deactivated.status).toBe("deactivated");
    expect(deactivated.id).toBe(staffUserId);
    expect(deactivated.name).toBe("Staff Ops Updated");
  });
});
