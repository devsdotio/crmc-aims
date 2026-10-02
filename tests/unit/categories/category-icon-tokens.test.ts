import { describe, expect, it } from "vitest";

import {
  CATEGORY_ICON_IDS,
  isCategoryIconId,
  nextFreeIconToken,
  takenIconTokens,
} from "@/lib/category-icon-tokens";

describe("category icon tokens", () => {
  it("keeps a palette large enough for exclusive icons", () => {
    expect(CATEGORY_ICON_IDS.length).toBe(80);
    expect(new Set(CATEGORY_ICON_IDS).size).toBe(CATEGORY_ICON_IDS.length);
    expect(isCategoryIconId("monitor")).toBe(true);
    expect(isCategoryIconId("not-an-icon")).toBe(false);
  });

  it("collects tokens already used by other rows", () => {
    const taken = takenIconTokens(
      [
        { id: "a", iconToken: "monitor" },
        { id: "b", iconToken: "  laptop " },
        { id: "c", iconToken: null },
        { id: "d", iconToken: "cpu" },
      ],
      "d"
    );

    expect(taken.has("monitor")).toBe(true);
    expect(taken.has("laptop")).toBe(true);
    expect(taken.has("cpu")).toBe(false);
    expect([...taken]).toEqual(["monitor", "laptop"]);
  });

  it("returns the first palette icon that is still free", () => {
    expect(nextFreeIconToken(new Set())).toBe("monitor");
    expect(nextFreeIconToken(new Set(["monitor", "laptop"]))).toBe("tablet");
    expect(nextFreeIconToken(new Set(CATEGORY_ICON_IDS))).toBeNull();
  });
});
