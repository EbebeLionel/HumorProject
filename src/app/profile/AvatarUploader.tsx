"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  userId: string;
  avatarUrl: string | null;
};

export default function AvatarUploader({ userId, avatarUrl }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);

    // The image itself goes to Supabase Storage; only its URL goes in the database
    const supabase = createClient();
    const path = `${userId}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // Same path on every upload, so bust the browser cache with a version param
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: `${publicUrl}?v=${Date.now()}`, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      router.refresh();
    }
    setUploading(false);
  }

  return (
    <div className="stack">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Your profile photo" className="avatar avatar-lg" />
      ) : (
        <div className="avatar avatar-lg avatar-placeholder">No photo</div>
      )}
      <label className="file-label">
        {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
        <input type="file" accept="image/*" onChange={onFileChange} disabled={uploading} hidden />
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
