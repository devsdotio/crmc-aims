import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface BibleVerseResponse {
  reference: string;
  text: string;
  translation: string;
  source: "api" | "fallback";
}

const INSPIRATIONAL_REFERENCES = [
  "colossians 3:23",
  "proverbs 3:5-6",
  "1 peter 4:10",
  "luke 16:10",
  "proverbs 16:3",
  "psalm 28:7",
  "joshua 1:9",
  "1 corinthians 16:14",
  "philippians 4:13",
  "jeremiah 29:11",
  "numbers 6:24-26",
  "philippians 4:6",
  "galatians 6:9",
  "psalm 118:24",
  "micah 6:8",
  "lamentations 3:22-23",
  "john 14:27",
  "1 thessalonians 5:18",
  "psalm 55:22",
  "psalm 119:105",
  "romans 12:12",
  "isaiah 40:31",
  "matthew 5:16",
  "psalm 23:1-3",
  "proverbs 17:22",
  "2 timothy 1:7",
  "psalm 46:1",
  "ephesians 4:32",
  "romans 8:28",
  "proverbs 11:25",
  "psalm 37:5",
  "matthew 11:28",
];

const FALLBACK_VERSES: Record<string, { text: string; reference: string }> = {
  "colossians 3:23": {
    text: "Whatever you do, work heartily, as for the Lord, and not for men.",
    reference: "Colossians 3:23",
  },
  "proverbs 3:5-6": {
    text: "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
    reference: "Proverbs 3:5-6",
  },
  "1 peter 4:10": {
    text: "As each has received a gift, employ it in serving one another, as good managers of the grace of God in its various forms.",
    reference: "1 Peter 4:10",
  },
  "luke 16:10": {
    text: "He who is faithful in a very little is faithful also in much.",
    reference: "Luke 16:10",
  },
  "proverbs 16:3": {
    text: "Commit your deeds to Yahweh, and your plans shall succeed.",
    reference: "Proverbs 16:3",
  },
  "philippians 4:13": {
    text: "I can do all things through Christ, who strengthens me.",
    reference: "Philippians 4:13",
  },
  "joshua 1:9": {
    text: "Be strong and courageous. Don't be afraid, neither be dismayed: for Yahweh your God is with you wherever you go.",
    reference: "Joshua 1:9",
  },
  "jeremiah 29:11": {
    text: "For I know the plans that I have for you, says Yahweh, plans for peace, and not for evil, to give you hope and a future.",
    reference: "Jeremiah 29:11",
  },
  "psalm 28:7": {
    text: "Yahweh is my strength and my shield. My heart has trusted in him, and I am helped.",
    reference: "Psalm 28:7",
  },
  "isaiah 40:31": {
    text: "But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles.",
    reference: "Isaiah 40:31",
  },
  "romans 8:28": {
    text: "We know that all things work together for good for those who love God, for those who are called according to his purpose.",
    reference: "Romans 8:28",
  },
  "philippians 4:6": {
    text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.",
    reference: "Philippians 4:6",
  },
  "matthew 11:28": {
    text: "Come to me, all you who labor and are heavily burdened, and I will give you rest.",
    reference: "Matthew 11:28",
  },
  "galatians 6:9": {
    text: "Let's not be weary in doing good, for we will reap in due season if we don't give up.",
    reference: "Galatians 6:9",
  },
};

const DEFAULT_FALLBACK = FALLBACK_VERSES["colossians 3:23"];

/** Keep external fetch short — bible-api.com often hangs on connect. */
const EXTERNAL_FETCH_MS = 2500;

function pickReference(requestedRef: string | null, isRandom: boolean): string {
  if (requestedRef) return requestedRef;
  if (isRandom) {
    const randIdx = Math.floor(Math.random() * INSPIRATIONAL_REFERENCES.length);
    return INSPIRATIONAL_REFERENCES[randIdx]!;
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return INSPIRATIONAL_REFERENCES[dayOfYear % INSPIRATIONAL_REFERENCES.length]!;
}

function fallbackPayload(targetRef: string): BibleVerseResponse {
  const fallback =
    FALLBACK_VERSES[targetRef.toLowerCase()] ?? DEFAULT_FALLBACK;
  return {
    reference: fallback.reference,
    text: fallback.text,
    translation: "WEB",
    source: "fallback",
  };
}

function jsonVerse(payload: BibleVerseResponse, maxAge: number) {
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=3600`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetRef = pickReference(
      searchParams.get("ref"),
      searchParams.get("random") === "true"
    );

    try {
      // Plain fetch (no next.revalidate) — cached Next fetches can "pipe" the
      // upstream response and surface ConnectTimeoutError as a hard failure.
      const res = await fetch(
        `https://bible-api.com/${encodeURIComponent(targetRef)}?translation=web`,
        {
          signal: AbortSignal.timeout(EXTERNAL_FETCH_MS),
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const data = (await res.json()) as {
          text?: string;
          reference?: string;
          translation_name?: string;
        };
        const cleanText = String(data.text ?? "")
          .replace(/\n+/g, " ")
          .trim();

        if (cleanText && data.reference) {
          return jsonVerse(
            {
              reference: data.reference,
              text: cleanText,
              translation: data.translation_name || "WEB",
              source: "api",
            },
            3600
          );
        }
      }
    } catch {
      // Timeout / DNS / connect — serve local fallback below.
    }

    return jsonVerse(fallbackPayload(targetRef), 300);
  } catch {
    return jsonVerse(
      {
        reference: DEFAULT_FALLBACK.reference,
        text: DEFAULT_FALLBACK.text,
        translation: "WEB",
        source: "fallback",
      },
      300
    );
  }
}
