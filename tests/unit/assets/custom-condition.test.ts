import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseConditionNotes,
  formatConditionNotes,
  getSavedCustomConditions,
  saveCustomCondition,
  removeCustomCondition,
  CUSTOM_CONDITIONS_STORAGE_KEY,
} from "@/lib/custom-condition";
import { flagMaintenanceSchema } from "@/server/modules/assets/asset.validation";

describe("custom-condition helpers", () => {
  describe("parseConditionNotes", () => {
    it("returns null customCondition and empty string for empty input", () => {
      expect(parseConditionNotes(null)).toEqual({ customCondition: null, notes: "" });
      expect(parseConditionNotes(undefined)).toEqual({ customCondition: null, notes: "" });
      expect(parseConditionNotes("")).toEqual({ customCondition: null, notes: "" });
      expect(parseConditionNotes("   ")).toEqual({ customCondition: null, notes: "" });
    });

    it("parses regular notes without custom condition", () => {
      const raw = "Fan making loud whining noise intermittently.";
      const res = parseConditionNotes(raw);
      expect(res.customCondition).toBeNull();
      expect(res.notes).toBe("Fan making loud whining noise intermittently.");
    });

    it("extracts custom condition and clean notes", () => {
      const raw = "[Condition: Calibration Required]\nSensor readings drift after 10 minutes.";
      const res = parseConditionNotes(raw);
      expect(res.customCondition).toBe("Calibration Required");
      expect(res.notes).toBe("Sensor readings drift after 10 minutes.");
    });

    it("handles inline spacing after custom condition prefix", () => {
      const raw = "[Condition: Screen Flickering] Display loses sync intermittently.";
      const res = parseConditionNotes(raw);
      expect(res.customCondition).toBe("Screen Flickering");
      expect(res.notes).toBe("Display loses sync intermittently.");
    });

    it("handles multi-line notes cleanly", () => {
      const raw = "[Condition: Water Ingress]\nLine 1: Rust observed.\nLine 2: Needs full drying.";
      const res = parseConditionNotes(raw);
      expect(res.customCondition).toBe("Water Ingress");
      expect(res.notes).toBe("Line 1: Rust observed.\nLine 2: Needs full drying.");
    });
  });

  describe("formatConditionNotes", () => {
    it("formats notes with custom condition prefix", () => {
      const formatted = formatConditionNotes("Power supply failed.", "Overheating Issue");
      expect(formatted).toBe("[Condition: Overheating Issue]\nPower supply failed.");
    });

    it("returns notes unchanged when customCondition is empty or whitespace", () => {
      expect(formatConditionNotes("Regular fault description", null)).toBe("Regular fault description");
      expect(formatConditionNotes("Regular fault description", undefined)).toBe("Regular fault description");
      expect(formatConditionNotes("Regular fault description", "   ")).toBe("Regular fault description");
    });
  });

  describe("localStorage custom conditions management", () => {
    const store: Record<string, string> = {};

    beforeEach(() => {
      for (const k in store) delete store[k];
      vi.stubGlobal("window", {
        localStorage: {
          getItem: (key: string) => store[key] ?? null,
          setItem: (key: string, value: string) => {
            store[key] = value;
          },
          removeItem: (key: string) => {
            delete store[key];
          },
        },
      });
    });

    it("saves new custom condition and avoids duplicate case-insensitive entries", () => {
      const result1 = saveCustomCondition("Overheating");
      expect(result1).toContain("Overheating");

      const result2 = saveCustomCondition("overheating");
      expect(result2.filter((c) => c.toLowerCase() === "overheating")).toHaveLength(1);

      const result3 = saveCustomCondition("Screen Defect");
      expect(result3).toEqual(["Screen Defect", "overheating"]);
    });

    it("retrieves saved custom conditions", () => {
      saveCustomCondition("Battery Degraded");
      const list = getSavedCustomConditions();
      expect(list).toContain("Battery Degraded");
    });

    it("removes a saved custom condition", () => {
      saveCustomCondition("To Delete");
      saveCustomCondition("To Keep");
      const updated = removeCustomCondition("to delete");
      expect(updated).not.toContain("To Delete");
      expect(updated).toContain("To Keep");
    });
  });

  describe("flagMaintenanceSchema validation", () => {
    it("validates payload with standard condition and notes", () => {
      const parsed = flagMaintenanceSchema.parse({
        notes: "Broken optical wheel",
        condition: "needs_maintenance",
      });
      expect(parsed.notes).toBe("Broken optical wheel");
      expect(parsed.condition).toBe("needs_maintenance");
      expect(parsed.customCondition).toBeUndefined();
    });

    it("validates payload with customCondition", () => {
      const parsed = flagMaintenanceSchema.parse({
        notes: "Power button stuck",
        condition: "needs_maintenance",
        customCondition: "Mechanical Jam",
      });
      expect(parsed.customCondition).toBe("Mechanical Jam");
    });

    it("rejects customCondition longer than 120 chars", () => {
      expect(() =>
        flagMaintenanceSchema.parse({
          notes: "Power button stuck",
          customCondition: "A".repeat(121),
        })
      ).toThrow();
    });
  });
});
