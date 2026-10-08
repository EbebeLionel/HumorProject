"use server";

import { createClient } from "@/lib/supabase/server";

export type VoteResult =
  | { error: string; signedOut?: boolean }
  | { vote: -1 | 0 | 1; upvotes: number; downvotes: number };

// vote = 1 (up), -1 (down), or 0 (remove your vote)
export async function castVote(captionId: string, vote: number): Promise<VoteResult> {
  if (vote !== 1 && vote !== -1 && vote !== 0) {
    return { error: "Invalid vote." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to vote.", signedOut: true };
  }

  const { error } =
    vote === 0
      ? await supabase.from("caption_votes").delete().eq("caption_id", captionId).eq("user_id", user.id)
      : await supabase.from("caption_votes").upsert(
          {
            caption_id: captionId,
            user_id: user.id,
            vote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "caption_id,user_id" }
        );

  if (error) {
    return { error: error.message };
  }

  // Return the fresh totals (kept up to date by a database trigger)
  const { data: caption } = await supabase
    .from("captions")
    .select("upvotes, downvotes")
    .eq("id", captionId)
    .single();

  return { vote, upvotes: caption?.upvotes ?? 0, downvotes: caption?.downvotes ?? 0 };
}
