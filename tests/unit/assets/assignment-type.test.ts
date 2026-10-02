import { describe, expect, it } from "vitest";

import {
  assignmentTypeLabel,
  assignmentTypeShortLabel,
} from "@/lib/asset-assignment-type";
import { isAssetAvailableForRequest } from "@/lib/assets-custody";

describe("fixed asset assignment type", () => {
  it("labels fixed assets separately from borrowable and assignable", () => {
    expect(assignmentTypeLabel("fixed")).toBe("Fixed");
    expect(assignmentTypeShortLabel("fixed")).toBe("Fixed");
    expect(assignmentTypeLabel("borrowable")).toBe("Borrowable");
    expect(assignmentTypeLabel("assignable")).toBe("Assignable");
  });

  it("does not treat a fixed asset as available to borrow or assign", () => {
    expect(
      isAssetAvailableForRequest({
        status: "active",
        assignmentType: "fixed",
      })
    ).toBe(false);
    expect(
      isAssetAvailableForRequest({
        status: "active",
        assignmentType: "borrowable",
      })
    ).toBe(true);
  });
});
