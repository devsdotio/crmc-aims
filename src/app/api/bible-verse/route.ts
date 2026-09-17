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
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedRef = searchParams.get("ref");
    const isRandom = searchParams.get("random") === "true";

    // Determine target reference
    let targetRef = requestedRef;
    if (!targetRef) {
      if (isRandom) {
        const randIdx = Math.floor(
          Math.random() * INSPIRATIONAL_REFERENCES.length
        );
        targetRef = INSPIRATIONAL_REFERENCES[randIdx];
      } else {
        // Daily deterministic verse
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor(
          (now.getTime() - start.getTime()) / 86400000
        );
        targetRef =
          INSPIRATIONAL_REFERENCES[
            dayOfYear % INSPIRATIONAL_REFERENCES.length
          ];
      }
    }

    const encodedRef = encodeURIComponent(targetRef);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      // Fetch from open-source Bible API (bible-api.com)
      const res = await fetch(
        `https://bible-api.com/${encodedRef}?translation=web`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          next: { revalidate: 3600 },
        }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const cleanText = String(data.text ?? "")
          .replace(/\n+/g, " ")
          .trim();

        if (cleanText && data.reference) {
          const payload: BibleVerseResponse = {
            reference: data.reference,
            text: cleanText,
            translation: data.translation_name || "WEB",
            source: "api",
          };
          return NextResponse.json(payload, {
            headers: {
              "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
          });
        }
      }
    } catch {
      clearTimeout(timeout);
    }

    // Fallback if external API request fails or times out
    const fallback =
      FALLBACK_VERSES[targetRef.toLowerCase()] ||
      FALLBACK_VERSES["colossians 3:23"];

    const payload: BibleVerseResponse = {
      reference: fallback.reference,
      text: fallback.text,
      translation: "WEB",
      source: "fallback",
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        reference: "Colossians 3:23",
        text: "Whatever you do, work heartily, as for the Lord, and not for men.",
        translation: "WEB",
        source: "fallback",
      } satisfies BibleVerseResponse,
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  }
}
