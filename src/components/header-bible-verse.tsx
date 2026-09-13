"use client";

import { useEffect, useState, useCallback } from "react";
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

export function HeaderBibleVerse() {
  const [verse, setVerse] = useState<VerseData>(DEFAULT_VERSE);
  const [loading, setLoading] = useState(false);

  const fetchVerse = useCallback(async (random = false) => {
    try {
      setLoading(true);
      const url = random ? "/api/bible-verse?random=true" : "/api/bible-verse";
      const res = await fetch(url, { cache: random ? "no-store" : "default" });
      if (res.ok) {
        const data: VerseData = await res.json();
        if (data.text && data.reference) {
          setVerse(data);
        }
      }
    } catch (err) {
      console.error("[header-bible-verse] Failed to fetch dynamic verse:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVerse(false);
  }, [fetchVerse]);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (loading) return;
    void fetchVerse(true);
  };

  return (
    <div className="hidden md:flex items-center gap-3.5">
      {/* 2-line right-aligned text */}
      <div
        onClick={handleNext}
        className={cn(
          "flex flex-col items-end text-right justify-center cursor-pointer select-none group",
          "max-w-[260px] lg:max-w-[380px] xl:max-w-[500px] min-w-0"
        )}
        title={`"${verse.text}"\n— ${verse.reference}\n\nClick to load another verse`}
      >
        {/* Line 1: Scripture quote */}
        <p
          className={cn(
            "text-xs italic text-text-secondary leading-tight truncate w-full group-hover:text-text transition-colors duration-150",
            loading && "opacity-50"
          )}
        >
          &ldquo;{verse.text}&rdquo;
        </p>

        {/* Line 2: Scripture reference */}
        <p className="text-[10px] font-semibold text-primary/80 font-mono tracking-tight leading-tight mt-0.5 group-hover:text-primary transition-colors">
          — {verse.reference}
        </p>
      </div>

      {/* Vertical line separator on the right side */}
      <div className="h-6 w-px bg-[#E3E5EC] shrink-0" aria-hidden="true" />
    </div>
  );
}
