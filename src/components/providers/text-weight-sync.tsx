"use client";

import { useLayoutEffect } from "react";
import { applyWeightedText, readWeightedTextEnabled } from "@/lib/text-weight";

/** Reapplies the saved preference if the boot script did not run. */
export function WeightedTextSync() {
  useLayoutEffect(() => {
    applyWeightedText(readWeightedTextEnabled());
  }, []);

  return null;
}
