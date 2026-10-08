"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_IMAGES_BUCKET, getThemeOfTheDay, getVibe } from "@/lib/captions";
import { buildCaptionPrompt, generateCaptions } from "@/lib/gemini";

// Keeps one person from burning through the free AI quota
const DAILY_LIMIT = 10;

export type GenerateResult = { error: string } | { imageId: string };

// Called after the browser has uploaded the photo to Storage at `storagePath`
export async function generateFromUpload(storagePath: string, vibeId: string): Promise<GenerateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to generate captions." };
  }

  const vibe = getVibe(vibeId);
  if (!vibe) {
    return { error: "Pick a vibe first." };
  }

  // Only accept files from the signed-in user's own folder
  if (!storagePath.startsWith(`${user.id}/`) || storagePath.includes("..")) {
    return { error: "Invalid upload." };
  }

  const removeUpload = () => supabase.storage.from(CAPTION_IMAGES_BUCKET).remove([storagePath]);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if ((count ?? 0) >= DAILY_LIMIT) {
    await removeUpload();
    return { error: `You've hit today's limit of ${DAILY_LIMIT} photos. Come back tomorrow!` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CAPTION_IMAGES_BUCKET).getPublicUrl(storagePath);

  const imageRes = await fetch(publicUrl, { cache: "no-store" });
  if (!imageRes.ok) {
    return { error: "Couldn't read your upload. Please try again." };
  }
  const mimeType = imageRes.headers.get("content-type") ?? "image/jpeg";
  const data = Buffer.from(await imageRes.arrayBuffer()).toString("base64");

  const theme = getThemeOfTheDay();
  const prompt = buildCaptionPrompt(vibe.instructions, theme);

  let result;
  try {
    result = await generateCaptions({ data, mimeType }, prompt);
  } catch (err) {
    await removeUpload();
    return { error: err instanceof Error ? err.message : "Caption generation failed." };
  }

  const { data: image, error: imageError } = await supabase
    .from("images")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      image_url: publicUrl,
      vibe: vibe.id,
      theme,
    })
    .select("id")
    .single();

  if (imageError) {
    await removeUpload();
    return { error: imageError.message };
  }

  const { error: captionsError } = await supabase.from("captions").insert(
    result.captions.map((content) => ({
      image_id: image.id,
      user_id: user.id,
      content,
      prompt,
      model: result.model,
    }))
  );

  if (captionsError) {
    await supabase.from("images").delete().eq("id", image.id);
    await removeUpload();
    return { error: captionsError.message };
  }

  revalidatePath("/");
  return { imageId: image.id };
}
