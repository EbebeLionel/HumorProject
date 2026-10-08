"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAPTION_IMAGES_BUCKET, VIBES, type VibeId } from "@/lib/captions";
import { generateFromUpload } from "./actions";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1280;

// Re-encode as a resized JPEG: smaller upload, fewer AI tokens, and it strips
// EXIF metadata (like the GPS location of your dorm) from phone photos
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", 0.85)
  );
}

export default function CreateForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [vibe, setVibe] = useState<VibeId>(VIBES[0].id);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    setError(null);
    if (chosen && !chosen.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (chosen && chosen.size > MAX_INPUT_BYTES) {
      setError("That photo is too big (max 15 MB).");
      return;
    }
    setFile(chosen);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    setError(null);

    let blob: Blob;
    try {
      setStatus("Preparing photo…");
      blob = await prepareImage(file);
    } catch {
      setStatus(null);
      setError("Your browser can't read that photo format. Try a JPG or PNG (iPhone: share as “Most Compatible”).");
      return;
    }

    setStatus("Uploading…");
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(CAPTION_IMAGES_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg" });

    if (uploadError) {
      setStatus(null);
      setError(uploadError.message);
      return;
    }

    setStatus("AI is writing captions… 🤖");
    const result = await generateFromUpload(path, vibe);
    if ("error" in result) {
      setStatus(null);
      setError(result.error);
      return;
    }

    router.push(`/i/${result.imageId}?new=1`);
  }

  const busy = status !== null;

  return (
    <form onSubmit={onSubmit} className="stack">
      <label className="file-label">
        {file ? "Choose a different photo" : "Choose a photo"}
        <input type="file" accept="image/*" onChange={onFileChange} disabled={busy} hidden />
      </label>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Preview of your photo" className="card-photo" />
      )}

      <fieldset className="vibes" disabled={busy}>
        <legend>Pick a vibe</legend>
        {VIBES.map((v) => (
          <label key={v.id} className={v.id === vibe ? "vibe vibe-active" : "vibe"}>
            <input
              type="radio"
              name="vibe"
              value={v.id}
              checked={v.id === vibe}
              onChange={() => setVibe(v.id)}
            />
            {v.emoji} {v.label}
          </label>
        ))}
      </fieldset>

      <button type="submit" disabled={busy || !file}>
        {status ?? "Generate captions"}
      </button>
      {error && <p className="error">{error}</p>}
      <p className="muted small">Photos are public once posted. Don&apos;t upload people who didn&apos;t agree to it.</p>
    </form>
  );
}
