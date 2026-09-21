"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerseData {
  reference: string;
  text: string;
  translation?: string;
  source?: "api" | "fallback";
}

const DEFAULT_VERSE: VerseData = {
  reference: "Colossians 3:23",
  text: "Whatever you do, work heartily, as for the Lord, and not for men.",
  translation: "WEB",
  source: "fallback",
};

const DAILY_CACHE_KEY = "aims.header-bible-verse.daily";

type DailyCache = {
  dateKey: string;
  verse: VerseData;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readDailyCache(): VerseData | null {
  try {
    const raw = sessionStorage.getItem(DAILY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyCache;
    if (parsed?.dateKey === todayKey() && parsed.verse?.text && parsed.verse?.reference) {
      return parsed.verse;
    }
  } catch {
    // Ignore storage errors (private mode / quota).
  }
  return null;
}

function writeDailyCache(verse: VerseData) {
  try {
    const payload: DailyCache = { dateKey: todayKey(), verse };
    sessionStorage.setItem(DAILY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

export function HeaderBibleVerse() {
  const [verse, setVerse] = useState<VerseData>(DEFAULT_VERSE);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDailyVerse = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const cached = readDailyCache();
      if (cached) {
        setVerse(cached);
        return;
      }

      const res = await fetch("/api/bible-verse", {
        cache: "default",
        signal: controller.signal,
      });

      if (!res.ok) return;

      const data = (await res.json()) as VerseData;
      if (!data.text || !data.reference) return;

      setVerse(data);
      writeDailyCache(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[header-bible-verse] Failed to fetch verse:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDailyVerse();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchDailyVerse]);

  return (
    <div
      className={cn(
        "hidden md:flex items-center gap-2.5 min-w-0 select-none",
        "rounded-xl px-2.5 py-1.5 -mr-1"
      )}
      title={`"${verse.text}"\n— ${verse.reference}`}
      aria-label={`Bible verse: ${verse.reference}`}
    >
      <div
        className={cn(
          "flex flex-col items-end text-right justify-center min-w-0",
          "max-w-64 lg:max-w-md xl:max-w-140",
          loading && "opacity-60"
        )}
      >
        <p className="text-xs italic text-text-secondary leading-snug line-clamp-2 w-full">
          &ldquo;{verse.text}&rdquo;
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-[#2A3260]/80 font-mono tracking-tight leading-tight">
          — {verse.reference}
        </p>
      </div>

      <div className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-lg bg-[#2A3260]/8 text-[#2A3260]">
        <BookOpen className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
