"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_IMAGES_BUCKET } from "@/lib/captions";

export type DeleteResult = { error: string } | { deleted: true };

// Deletes a photo (its captions and votes go with it via ON DELETE CASCADE).
// Only the uploader may do this; RLS enforces the same rule in the database.
export async function deleteImage(imageId: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to delete photos." };
  }

  const { data: image } = await supabase
    .from("images")
    .select("id, user_id, storage_path")
    .eq("id", imageId)
    .maybeSingle<{ id: string; user_id: string; storage_path: string }>();

  if (!image) {
    return { error: "That photo no longer exists." };
  }
  if (image.user_id !== user.id) {
    return { error: "You can only delete photos you uploaded." };
  }

  const { data: deleted, error } = await supabase
    .from("images")
    .delete()
    .eq("id", image.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!deleted?.length) {
    return { error: "Couldn't delete that photo." };
  }

  await supabase.storage.from(CAPTION_IMAGES_BUCKET).remove([image.storage_path]);

  revalidatePath("/", "layout");
  return { deleted: true };
}
