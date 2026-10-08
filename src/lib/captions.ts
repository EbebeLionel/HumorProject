export const CAPTION_IMAGES_BUCKET = "caption-images";

// Caption styles a user can pick. `instructions` goes straight into the AI prompt.
export const VIBES = [
  {
    id: "chronically-online",
    label: "Chronically online",
    emoji: "📱",
    instructions:
      "Write like a chronically online college student: current internet slang, meme formats, lowercase energy, Twitter/TikTok cadence.",
  },
  {
    id: "midwest-in-nyc",
    label: "Midwesterner in NYC",
    emoji: "🌽",
    instructions:
      "Write from the point of view of a polite Midwesterner who just moved to New York City and is baffled, delighted, or overwhelmed by it.",
  },
  {
    id: "columbia",
    label: "Columbia insider",
    emoji: "🦁",
    instructions:
      "Write inside jokes a Columbia University undergrad would get: Butler Library all-nighters, the Core Curriculum, Lit Hum, dining halls, Low Steps, the 1 train, dorm life, midterm season.",
  },
  {
    id: "nature-doc",
    label: "Nature documentary",
    emoji: "🎙️",
    instructions:
      "Narrate the photo like a hushed, dramatic nature documentary narrator observing New Yorkers in their natural habitat.",
  },
  {
    id: "unhinged",
    label: "Unhinged",
    emoji: "🌀",
    instructions: "Be absurd, chaotic, and surreal, but still clearly about what's in the photo.",
  },
] as const;

export type VibeId = (typeof VIBES)[number]["id"];

export function getVibe(id: string) {
  return VIBES.find((vibe) => vibe.id === id);
}

// A new theme every day gives people a reason to come back and something to go photograph
const THEMES = [
  "Subway moments",
  "Dining hall reviews",
  "Things only NYC has",
  "Dorm life",
  "Weekend adventures",
  "Midterm survival",
  "NYC prices",
  "Bodega cats & bodega finds",
  "Campus wildlife (squirrels count)",
  "Fits seen on Broadway",
  "Library at 2am",
  "Central Park",
  "Overheard in New York",
  "The view from your window",
];

export function getThemeOfTheDay(date = new Date()) {
  // Days since the epoch in New York time, so the theme flips at local midnight
  const nyDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayNumber = Math.floor(
    Date.UTC(nyDate.getFullYear(), nyDate.getMonth(), nyDate.getDate()) / 86_400_000
  );
  return THEMES[dayNumber % THEMES.length];
}

export type Caption = {
  id: string;
  image_id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  created_at: string;
};

export type ImageWithCaptions = {
  id: string;
  user_id: string;
  image_url: string;
  vibe: string;
  theme: string | null;
  created_at: string;
  captions: Caption[];
};

export const IMAGE_WITH_CAPTIONS_SELECT =
  "id, user_id, image_url, vibe, theme, created_at, captions (id, image_id, content, upvotes, downvotes, score, created_at)";
