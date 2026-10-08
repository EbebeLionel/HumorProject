import type { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_WITH_CAPTIONS_SELECT, type ImageWithCaptions } from "@/lib/captions";

export const SORTS = ["hot", "new", "top"] as const;
export type Sort = (typeof SORTS)[number];

const PAGE_SIZE = 20;
const HOT_WINDOW_DAYS = 7;

function sortCaptions(images: ImageWithCaptions[]) {
  for (const image of images) {
    image.captions.sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at));
  }
  return images;
}

export async function getFeed(supabase: SupabaseClient, sort: Sort) {
  if (sort === "new") {
    const { data, error } = await supabase
      .from("images")
      .select(IMAGE_WITH_CAPTIONS_SELECT)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)
      .returns<ImageWithCaptions[]>();
    return { images: sortCaptions(data ?? []), error };
  }

  // hot / top: rank photos by their best caption
  let query = supabase
    .from("captions")
    .select("image_id")
    .gt("score", 0)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE * 4);

  if (sort === "hot") {
    query = query.gte("created_at", new Date(Date.now() - HOT_WINDOW_DAYS * 86_400_000).toISOString());
  }

  const { data: ranked, error: rankError } = await query;
  if (rankError) {
    return { images: [], error: rankError };
  }

  const imageIds = [...new Set(ranked.map((row) => row.image_id as string))].slice(0, PAGE_SIZE);
  if (imageIds.length === 0) {
    return { images: [], error: null };
  }

  const { data, error } = await supabase
    .from("images")
    .select(IMAGE_WITH_CAPTIONS_SELECT)
    .in("id", imageIds)
    .returns<ImageWithCaptions[]>();

  const order = new Map(imageIds.map((id, i) => [id, i]));
  const images = (data ?? []).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return { images: sortCaptions(images), error };
}

export async function getImage(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("images")
    .select(IMAGE_WITH_CAPTIONS_SELECT)
    .eq("id", id)
    .maybeSingle<ImageWithCaptions>();
  return data ? sortCaptions([data])[0] : null;
}

// The signed-in user's votes on these captions, as { captionId: 1 | -1 }
export async function getMyVotes(supabase: SupabaseClient, userId: string | undefined, images: ImageWithCaptions[]) {
  const captionIds = images.flatMap((image) => image.captions.map((c) => c.id));
  if (!userId || captionIds.length === 0) {
    return {};
  }

  const { data } = await supabase
    .from("caption_votes")
    .select("caption_id, vote")
    .eq("user_id", userId)
    .in("caption_id", captionIds);

  return Object.fromEntries((data ?? []).map((row) => [row.caption_id, row.vote])) as Record<string, 1 | -1>;
}
