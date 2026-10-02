import { describe, expect, it } from "vitest";

import { getCategoryStyle } from "@/constants/categories";

describe("getCategoryStyle", () => {
  it("returns the chosen color and icon for a named category", () => {
    const style = getCategoryStyle("Monitors", "Monitors", "blue", "monitor");

    expect(style.label).toBe("Monitors");
    expect(style.iconToken).toBe("monitor");
    expect(style.cssVar).toBeTruthy();
  });

  it("keeps a known category style when no custom color is set", () => {
    const style = getCategoryStyle("computing", undefined, undefined, "cpu");

    expect(style.label).toBeTruthy();
    expect(style.iconToken).toBe("cpu");
  });

  it("handles an empty category name", () => {
    const style = getCategoryStyle("", undefined, undefined, undefined);

    expect(style.label).toBe("General");
    expect(style.iconToken).toBeUndefined();
  });

  it("passes an unknown icon token through for the fallback glyph", () => {
    const style = getCategoryStyle("Widgets", "Widgets", "not-a-color", "not-an-icon");

    expect(style.label).toBe("Widgets");
    expect(style.iconToken).toBe("not-an-icon");
  });

  it("keeps a blank icon token so the icon component can fall back", () => {
    const style = getCategoryStyle("Widgets", "Widgets", undefined, "");

    expect(style.iconToken).toBe("");
  });
});
