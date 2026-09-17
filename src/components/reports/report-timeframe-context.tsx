"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";

export interface ReportTimeframe {
  startDate: string | undefined;
  endDate: string | undefined;
}

interface ReportTimeframeContextValue {
  timeframe: ReportTimeframe;
  setTimeframe: (update: Partial<ReportTimeframe>) => void;
  resetTimeframe: () => void;
}

const STORAGE_KEY = "crmc_reports_timeframe";

const ReportTimeframeContext = createContext<ReportTimeframeContextValue | null>(null);

export function ReportTimeframeProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Initialize from URL search params or sessionStorage
  const [timeframe, setTimeframeState] = useState<ReportTimeframe>(() => {
    if (typeof window !== "undefined") {
      const urlStart = new URLSearchParams(window.location.search).get("startDate") || undefined;
      const urlEnd = new URLSearchParams(window.location.search).get("endDate") || undefined;
      if (urlStart || urlEnd) {
        return { startDate: urlStart, endDate: urlEnd };
      }
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            startDate: parsed.startDate || undefined,
            endDate: parsed.endDate || undefined,
          };
        }
      } catch {
        // ignore storage parse errors
      }
    }
    return { startDate: undefined, endDate: undefined };
  });

  // Sync state if URL searchParams change
  useEffect(() => {
    const urlStart = searchParams.get("startDate") || undefined;
    const urlEnd = searchParams.get("endDate") || undefined;
    if (urlStart !== timeframe.startDate || urlEnd !== timeframe.endDate) {
      if (urlStart !== undefined || urlEnd !== undefined) {
        setTimeframeState({ startDate: urlStart, endDate: urlEnd });
      }
    }
  }, [searchParams, timeframe.startDate, timeframe.endDate]);

  const updateUrlParams = useCallback((newStart: string | undefined, newEnd: string | undefined) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (newStart) {
      params.set("startDate", newStart);
    } else {
      params.delete("startDate");
    }
    if (newEnd) {
      params.set("endDate", newEnd);
    } else {
      params.delete("endDate");
    }
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, []);

  // Keep URL search params synchronized when navigating across subpages
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timeframe.startDate || timeframe.endDate) {
      const currentParams = new URLSearchParams(window.location.search);
      const currentStart = currentParams.get("startDate") || undefined;
      const currentEnd = currentParams.get("endDate") || undefined;
      if (currentStart !== timeframe.startDate || currentEnd !== timeframe.endDate) {
        updateUrlParams(timeframe.startDate, timeframe.endDate);
      }
    }
  }, [pathname, timeframe.startDate, timeframe.endDate, updateUrlParams]);

  const setTimeframe = useCallback(
    (update: Partial<ReportTimeframe>) => {
      setTimeframeState((prev) => {
        const next: ReportTimeframe = {
          startDate: "startDate" in update ? update.startDate : prev.startDate,
          endDate: "endDate" in update ? update.endDate : prev.endDate,
        };
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage write errors
        }
        updateUrlParams(next.startDate, next.endDate);
        return next;
      });
    },
    [updateUrlParams]
  );

  const resetTimeframe = useCallback(() => {
    setTimeframeState({ startDate: undefined, endDate: undefined });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    updateUrlParams(undefined, undefined);
  }, [updateUrlParams]);

  const value = useMemo(
    () => ({ timeframe, setTimeframe, resetTimeframe }),
    [timeframe, setTimeframe, resetTimeframe]
  );

  return (
    <ReportTimeframeContext.Provider value={value}>
      {children}
    </ReportTimeframeContext.Provider>
  );
}

export function useReportTimeframe() {
  const context = useContext(ReportTimeframeContext);
  if (!context) {
    throw new Error("useReportTimeframe must be used within a ReportTimeframeProvider");
  }
  return context;
}
