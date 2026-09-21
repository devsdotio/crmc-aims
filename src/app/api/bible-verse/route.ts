import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface BibleVerseResponse {
  reference: string;
  text: string;
  translation: string;
  source: "api" | "fallback";
}

type VerseEntry = {
  key: string;
  reference: string;
  text: string;
};

/**
 * Curated workplace / stewardship verses for the header.
 * Keys are lowercase and match bible-api.com lookup paths.
 */
const VERSE_CATALOG: VerseEntry[] = [
  {
    key: "colossians 3:23",
    reference: "Colossians 3:23",
    text: "Whatever you do, work heartily, as for the Lord, and not for men.",
  },
  {
    key: "proverbs 3:5-6",
    reference: "Proverbs 3:5-6",
    text: "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
  },
  {
    key: "1 peter 4:10",
    reference: "1 Peter 4:10",
    text: "As each has received a gift, employ it in serving one another, as good managers of the grace of God in its various forms.",
  },
  {
    key: "luke 16:10",
    reference: "Luke 16:10",
    text: "He who is faithful in a very little is faithful also in much.",
  },
  {
    key: "proverbs 16:3",
    reference: "Proverbs 16:3",
    text: "Commit your deeds to Yahweh, and your plans shall succeed.",
  },
  {
    key: "psalm 28:7",
    reference: "Psalm 28:7",
    text: "Yahweh is my strength and my shield. My heart has trusted in him, and I am helped.",
  },
  {
    key: "joshua 1:9",
    reference: "Joshua 1:9",
    text: "Be strong and courageous. Don't be afraid, neither be dismayed: for Yahweh your God is with you wherever you go.",
  },
  {
    key: "1 corinthians 16:14",
    reference: "1 Corinthians 16:14",
    text: "Let all that you do be done in love.",
  },
  {
    key: "philippians 4:13",
    reference: "Philippians 4:13",
    text: "I can do all things through Christ, who strengthens me.",
  },
  {
    key: "jeremiah 29:11",
    reference: "Jeremiah 29:11",
    text: "For I know the plans that I have for you, says Yahweh, plans for peace, and not for evil, to give you hope and a future.",
  },
  {
    key: "numbers 6:24-26",
    reference: "Numbers 6:24-26",
    text: "Yahweh bless you, and keep you. Yahweh make his face to shine on you, and be gracious to you. Yahweh lift up his face toward you, and give you peace.",
  },
  {
    key: "philippians 4:6",
    reference: "Philippians 4:6",
    text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.",
  },
  {
    key: "galatians 6:9",
    reference: "Galatians 6:9",
    text: "Let's not be weary in doing good, for we will reap in due season if we don't give up.",
  },
  {
    key: "psalm 118:24",
    reference: "Psalm 118:24",
    text: "This is the day that Yahweh has made. We will rejoice and be glad in it!",
  },
  {
    key: "micah 6:8",
    reference: "Micah 6:8",
    text: "He has shown you, O man, what is good. What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?",
  },
  {
    key: "lamentations 3:22-23",
    reference: "Lamentations 3:22-23",
    text: "It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning. Great is your faithfulness.",
  },
  {
    key: "john 14:27",
    reference: "John 14:27",
    text: "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don't let your heart be troubled, neither let it be fearful.",
  },
  {
    key: "1 thessalonians 5:18",
    reference: "1 Thessalonians 5:18",
    text: "In everything give thanks, for this is the will of God in Christ Jesus toward you.",
  },
  {
    key: "psalm 55:22",
    reference: "Psalm 55:22",
    text: "Cast your burden on Yahweh and he will sustain you. He will never allow the righteous to be moved.",
  },
  {
    key: "psalm 119:105",
    reference: "Psalm 119:105",
    text: "Your word is a lamp to my feet, and a light for my path.",
  },
  {
    key: "romans 12:12",
    reference: "Romans 12:12",
    text: "Rejoicing in hope, enduring in troubles, continuing steadfastly in prayer.",
  },
  {
    key: "isaiah 40:31",
    reference: "Isaiah 40:31",
    text: "But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.",
  },
  {
    key: "matthew 5:16",
    reference: "Matthew 5:16",
    text: "Even so, let your light shine before men, that they may see your good works and glorify your Father who is in heaven.",
  },
  {
    key: "psalm 23:1-3",
    reference: "Psalm 23:1-3",
    text: "Yahweh is my shepherd; I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.",
  },
  {
    key: "proverbs 17:22",
    reference: "Proverbs 17:22",
    text: "A cheerful heart makes good medicine, but a crushed spirit dries up the bones.",
  },
  {
    key: "2 timothy 1:7",
    reference: "2 Timothy 1:7",
    text: "For God didn't give us a spirit of fear, but of power, love, and self-control.",
  },
  {
    key: "psalm 46:1",
    reference: "Psalm 46:1",
    text: "God is our refuge and strength, a very present help in trouble.",
  },
  {
    key: "ephesians 4:32",
    reference: "Ephesians 4:32",
    text: "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.",
  },
  {
    key: "romans 8:28",
    reference: "Romans 8:28",
    text: "We know that all things work together for good for those who love God, for those who are called according to his purpose.",
  },
  {
    key: "proverbs 11:25",
    reference: "Proverbs 11:25",
    text: "The liberal soul shall be made fat. He who waters shall be watered also himself.",
  },
  {
    key: "psalm 37:5",
    reference: "Psalm 37:5",
    text: "Commit your way to Yahweh. Trust also in him, and he will do this.",
  },
  {
    key: "matthew 11:28",
    reference: "Matthew 11:28",
    text: "Come to me, all you who labor and are heavily burdened, and I will give you rest.",
  },
  {
    key: "proverbs 27:17",
    reference: "Proverbs 27:17",
    text: "Iron sharpens iron; so a man sharpens his friend's countenance.",
  },
  {
    key: "ecclesiastes 9:10",
    reference: "Ecclesiastes 9:10",
    text: "Whatever your hand finds to do, do it with your might.",
  },
  {
    key: "psalm 90:17",
    reference: "Psalm 90:17",
    text: "Let the favor of the Lord our God be on us. Establish the work of our hands for us. Yes, establish the work of our hands.",
  },
  {
    key: "colossians 3:17",
    reference: "Colossians 3:17",
    text: "Whatever you do, in word or in deed, do all in the name of the Lord Jesus, giving thanks to God the Father through him.",
  },
  {
    key: "proverbs 22:29",
    reference: "Proverbs 22:29",
    text: "Do you see a man skilled in his work? He will serve kings. He won't serve obscure men.",
  },
  {
    key: "romans 12:11",
    reference: "Romans 12:11",
    text: "Not lagging in diligence, fervent in spirit, serving the Lord.",
  },
];

const VERSE_BY_KEY = new Map(VERSE_CATALOG.map((v) => [v.key, v]));
const DEFAULT_FALLBACK = VERSE_CATALOG[0]!;

/** Keep external fetch short — bible-api.com often hangs on connect. */
const EXTERNAL_FETCH_MS = 2500;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function pickCatalogEntry(
  requestedRef: string | null,
  isRandom: boolean,
  excludeKey: string | null
): VerseEntry {
  if (requestedRef) {
    const key = normalizeKey(requestedRef);
    return VERSE_BY_KEY.get(key) ?? {
      key,
      reference: requestedRef,
      text: DEFAULT_FALLBACK.text,
    };
  }

  const pool =
    isRandom && excludeKey
      ? VERSE_CATALOG.filter((v) => v.key !== normalizeKey(excludeKey))
      : VERSE_CATALOG;

  const choices = pool.length > 0 ? pool : VERSE_CATALOG;

  if (isRandom) {
    const randIdx = Math.floor(Math.random() * choices.length);
    return choices[randIdx]!;
  }

  return choices[dayOfYear() % choices.length]!;
}

function cleanVerseText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
}

function fallbackPayload(entry: VerseEntry): BibleVerseResponse {
  const known = VERSE_BY_KEY.get(entry.key) ?? DEFAULT_FALLBACK;
  return {
    reference: known.reference,
    text: known.text,
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

/**
 * @swagger
 * /api/bible-verse:
 *   get:
 *     summary: Get a daily or random inspirational Bible verse
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: random
 *         schema: { type: boolean }
 *         description: When true, returns a random curated verse instead of the daily one
 *       - in: query
 *         name: exclude
 *         schema: { type: string }
 *         description: Reference key to avoid when picking a random verse
 *       - in: query
 *         name: ref
 *         schema: { type: string }
 *         description: Specific passage reference (e.g. "colossians 3:23")
 *     responses:
 *       200:
 *         description: Verse payload (API or local fallback)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isRandom = searchParams.get("random") === "true";
    const entry = pickCatalogEntry(
      searchParams.get("ref"),
      isRandom,
      searchParams.get("exclude")
    );

    try {
      // Plain fetch (no next.revalidate) — cached Next fetches can pipe the
      // upstream response and surface ConnectTimeoutError as a hard failure.
      const res = await fetch(
        `https://bible-api.com/${encodeURIComponent(entry.key)}?translation=web`,
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
        const cleanText = cleanVerseText(String(data.text ?? ""));

        if (cleanText && data.reference) {
          return jsonVerse(
            {
              reference: data.reference,
              text: cleanText,
              translation: data.translation_name || "WEB",
              source: "api",
            },
            isRandom ? 60 : 3600
          );
        }
      }
    } catch {
      // Timeout / DNS / connect — serve local fallback below.
    }

    return jsonVerse(fallbackPayload(entry), isRandom ? 60 : 300);
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
