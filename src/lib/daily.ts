import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_WITH_CAPTIONS_SELECT,
  getDailyTheme,
  nyDateKey,
  nyDayStart,
  type Caption,
  type ImageWithCaptions,
} from "@/lib/captions";

// Rating this many captions completes the daily challenge's voting step
export const DAILY_VOTE_GOAL = 10;

const STREAK_LOOKBACK_DAYS = 60;

export type WinningCaption = Caption & {
  images: { id: string; image_url: string; theme: string | null } | null;
};

// Captions posted during one New York day, funniest first
export async function getDayWinners(supabase: SupabaseClient, offsetDays: number, limit: number) {
  const { data, error } = await supabase
    .from("captions")
    .select("id, image_id, content, upvotes, downvotes, score, created_at, images (id, image_url, theme)")
    .gte("created_at", nyDayStart(offsetDays).toISOString())
    .lt("created_at", nyDayStart(offsetDays + 1).toISOString())
    .gt("score", 0)
    .order("score", { ascending: false })
    .order("upvotes", { ascending: false })
    .limit(limit)
    .returns<WinningCaption[]>();
  return { winners: data ?? [], error };
}

// Funniest captions posted in the last `days` days
export async function getTopCaptions(supabase: SupabaseClient, days: number, limit: number) {
  const { data, error } = await supabase
    .from("captions")
    .select("id, image_id, content, upvotes, downvotes, score, created_at, images (id, image_url, theme)")
    .gte("created_at", nyDayStart(-days).toISOString())
    .gt("score", 0)
    .order("score", { ascending: false })
    .order("upvotes", { ascending: false })
    .limit(limit)
    .returns<WinningCaption[]>();
  return { captions: data ?? [], error };
}

// Photos posted during one New York day, ranked by their best caption
export async function getDayBoard(supabase: SupabaseClient, offsetDays: number) {
  const { data, error } = await supabase
    .from("images")
    .select(IMAGE_WITH_CAPTIONS_SELECT)
    .gte("created_at", nyDayStart(offsetDays).toISOString())
    .lt("created_at", nyDayStart(offsetDays + 1).toISOString())
    .limit(100)
    .returns<ImageWithCaptions[]>();

  const images = data ?? [];
  for (const image of images) {
    image.captions.sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at));
  }
  const best = (image: ImageWithCaptions) => image.captions[0]?.score ?? 0;
  images.sort((a, b) => best(b) - best(a) || b.created_at.localeCompare(a.created_at));
  return { images, error };
}

// Consecutive New York days (ending today, or yesterday if today isn't done yet)
// on which the user voted or posted
export async function getStreak(supabase: SupabaseClient, userId: string) {
  const since = nyDayStart(-STREAK_LOOKBACK_DAYS).toISOString();
  const [votes, posts] = await Promise.all([
    supabase.from("caption_votes").select("updated_at").eq("user_id", userId).gte("updated_at", since),
    supabase.from("images").select("created_at").eq("user_id", userId).gte("created_at", since),
  ]);

  const activeDays = new Set([
    ...(votes.data ?? []).map((row) => nyDateKey(new Date(row.updated_at))),
    ...(posts.data ?? []).map((row) => nyDateKey(new Date(row.created_at))),
  ]);

  const dayKey = (offset: number) => nyDateKey(new Date(nyDayStart(offset).getTime() + 12 * 3_600_000));
  let offset = activeDays.has(dayKey(0)) ? 0 : -1;
  let streak = 0;
  while (activeDays.has(dayKey(offset)) && streak <= STREAK_LOOKBACK_DAYS) {
    streak++;
    offset--;
  }
  return { streak, activeToday: activeDays.has(dayKey(0)) };
}

export type Challenge = {
  theme: ReturnType<typeof getDailyTheme>;
  yesterdayTheme: ReturnType<typeof getDailyTheme>;
  hoursLeft: number;
  minutesLeft: number;
  votesToday: number;
  postedToday: boolean;
  streak: number;
  activeToday: boolean;
  yesterdayWinner: WinningCaption | null;
};

// Everything the home page's daily challenge panel needs
export async function getChallenge(supabase: SupabaseClient, userId: string | undefined): Promise<Challenge> {
  const todayStart = nyDayStart(0).toISOString();
  const msLeft = nyDayStart(1).getTime() - Date.now();

  const [{ winners }, votes, posts, streak] = await Promise.all([
    getDayWinners(supabase, -1, 1),
    userId
      ? supabase
          .from("caption_votes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("updated_at", todayStart)
      : null,
    userId
      ? supabase
          .from("images")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", todayStart)
      : null,
    userId ? getStreak(supabase, userId) : null,
  ]);

  return {
    theme: getDailyTheme(0),
    yesterdayTheme: getDailyTheme(-1),
    hoursLeft: Math.floor(msLeft / 3_600_000),
    minutesLeft: Math.floor((msLeft % 3_600_000) / 60_000),
    votesToday: votes?.count ?? 0,
    postedToday: (posts?.count ?? 0) > 0,
    streak: streak?.streak ?? 0,
    activeToday: streak?.activeToday ?? false,
    yesterdayWinner: winners[0] ?? null,
  };
}
