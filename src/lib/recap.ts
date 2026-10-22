import type { SupabaseClient } from "@supabase/supabase-js";
import { getVibeLabel, nyDayStart, type Caption } from "@/lib/captions";

const FALLBACK_VOTES = 30;

type VoteRow = {
  vote: 1 | -1;
  updated_at: string;
  captions:
    | (Caption & { images: { id: string; image_url: string; vibe: string; theme: string | null } | null })
    | null;
};

export type RecapItem = {
  vote: 1 | -1;
  caption: Caption;
  image: { id: string; image_url: string; vibe: string; theme: string | null };
  // What everyone else said, not counting this user's own vote
  othersUp: number;
  othersDown: number;
  crowd: 1 | -1 | 0 | null; // majority of others; 0 = tie, null = nobody else voted yet
};

export type Recap = {
  scope: "today" | "recent";
  items: RecapItem[];
  liked: number;
  passed: number;
  agreement: number | null; // share of votes that matched the crowd, 0..1
  favorites: RecapItem[];
  hotTakes: RecapItem[];
  firstVotes: number;
  favoriteVibe: { emoji: string; label: string; rate: number } | null;
};

function toItems(rows: VoteRow[]): RecapItem[] {
  return rows.flatMap((row) => {
    const caption = row.captions;
    if (!caption?.images) return [];
    const { images: image, ...rest } = caption;
    const othersUp = caption.upvotes - (row.vote === 1 ? 1 : 0);
    const othersDown = caption.downvotes - (row.vote === -1 ? 1 : 0);
    const crowd = othersUp + othersDown === 0 ? null : othersUp > othersDown ? 1 : othersUp < othersDown ? -1 : 0;
    return [{ vote: row.vote, caption: rest, image, othersUp, othersDown, crowd }];
  });
}

// Summary of the user's votes today (or their latest votes, if they haven't voted today)
export async function getRecap(supabase: SupabaseClient, userId: string) {
  const select =
    "vote, updated_at, captions (id, image_id, content, upvotes, downvotes, score, created_at, images (id, image_url, vibe, theme))";

  const today = await supabase
    .from("caption_votes")
    .select(select)
    .eq("user_id", userId)
    .gte("updated_at", nyDayStart(0).toISOString())
    .order("updated_at", { ascending: false })
    .returns<VoteRow[]>();

  let scope: Recap["scope"] = "today";
  let rows = today.data ?? [];
  if (!today.error && rows.length === 0) {
    scope = "recent";
    const recent = await supabase
      .from("caption_votes")
      .select(select)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(FALLBACK_VOTES)
      .returns<VoteRow[]>();
    rows = recent.data ?? [];
  }

  const items = toItems(rows);
  const judged = items.filter((item) => item.crowd === 1 || item.crowd === -1);
  const agreed = judged.filter((item) => item.vote === item.crowd);

  const byVibe = new Map<string, { likes: number; total: number }>();
  for (const item of items) {
    const label = getVibeLabel(item.image.vibe);
    const key = item.image.vibe.startsWith("custom:") ? "custom:" : item.image.vibe;
    if (!label) continue;
    const entry = byVibe.get(key) ?? { likes: 0, total: 0 };
    entry.total++;
    if (item.vote === 1) entry.likes++;
    byVibe.set(key, entry);
  }
  const [topVibe] = [...byVibe.entries()]
    .filter(([, stats]) => stats.total >= 2 && stats.likes > 0)
    .sort(([, a], [, b]) => b.likes / b.total - a.likes / a.total || b.total - a.total);
  const vibeLabel = topVibe
    ? topVibe[0] === "custom:"
      ? { emoji: "✍️", label: "Custom vibes" }
      : getVibeLabel(topVibe[0])
    : null;

  const recap: Recap = {
    scope,
    items,
    liked: items.filter((item) => item.vote === 1).length,
    passed: items.filter((item) => item.vote === -1).length,
    agreement: judged.length ? agreed.length / judged.length : null,
    favorites: items
      .filter((item) => item.vote === 1)
      .sort((a, b) => b.caption.score - a.caption.score)
      .slice(0, 6),
    hotTakes: judged
      .filter((item) => item.vote !== item.crowd)
      .sort((a, b) => b.othersUp + b.othersDown - (a.othersUp + a.othersDown))
      .slice(0, 3),
    firstVotes: items.filter((item) => item.crowd === null).length,
    favoriteVibe: vibeLabel && topVibe ? { ...vibeLabel, rate: topVibe[1].likes / topVibe[1].total } : null,
  };

  return { recap, error: today.error };
}
