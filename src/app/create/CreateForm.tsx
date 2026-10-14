"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CAPTION_IMAGES_BUCKET, CUSTOM_VIBE_MAX_LENGTH, VIBES, type VibeId } from "@/lib/captions";
import { generateFromUpload } from "./actions";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 1280;

const CUSTOM_IDEAS = [
  "Roast it like a Yelp review",
  "As a dramatic breakup text",
  "Pretend it's a LinkedIn post",
  "Overly wholesome grandma energy",
];

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
  const [dragging, setDragging] = useState(false);
  const [vibe, setVibe] = useState<VibeId | "custom">(VIBES[0].id);
  const [customVibe, setCustomVibe] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCustom = vibe === "custom";

  function chooseFile(chosen: File | null) {
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

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!busy) chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  function onCustomChange(text: string) {
    setCustomVibe(text);
    // Typing your own direction selects it
    setVibe(text.trim() ? "custom" : vibe === "custom" ? VIBES[0].id : vibe);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    if (isCustom && customVibe.trim().length < 3) {
      setError("Describe your vibe in a few words first.");
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
    const result = await generateFromUpload(path, vibe, isCustom ? customVibe : undefined);
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
      <label
        className={["dropzone", preview ? "has-preview" : "", dragging ? "dragging" : ""].join(" ")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          disabled={busy}
          hidden
        />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview of your photo" />
            <span className="btn btn-ghost btn-sm change">Change photo</span>
          </>
        ) : (
          <>
            <span className="big" aria-hidden="true">📸</span>
            <strong>Choose a photo</strong>
            <span className="muted small">or drag it here · JPG, PNG, WebP</span>
          </>
        )}
      </label>

      <fieldset className="vibes" disabled={busy}>
        <legend>Pick a vibe</legend>
        {VIBES.map((v) => (
          <label key={v.id} className={v.id === vibe ? "vibe vibe-active" : "vibe"}>
            <input type="radio" name="vibe" value={v.id} checked={v.id === vibe} onChange={() => setVibe(v.id)} />
            {v.emoji} {v.label}
          </label>
        ))}
        <label className={isCustom ? "vibe vibe-active" : "vibe"}>
          <input type="radio" name="vibe" value="custom" checked={isCustom} onChange={() => setVibe("custom")} />
          ✍️ My own vibe
        </label>

        <div className={isCustom ? "custom-vibe active" : "custom-vibe"}>
          <label className="field">
            …or tell the AI exactly where to take it
            <input
              className="input"
              value={customVibe}
              onChange={(event) => onCustomChange(event.target.value)}
              onFocus={() => customVibe.trim() && setVibe("custom")}
              maxLength={CUSTOM_VIBE_MAX_LENGTH}
              placeholder="e.g. narrate it like a true-crime podcast about the dining hall"
            />
          </label>
          <div className="custom-vibe-foot">
            <span>Your direction is sent to the AI along with the photo.</span>
            <span>
              {customVibe.length}/{CUSTOM_VIBE_MAX_LENGTH}
            </span>
          </div>
          <div className="idea-chips">
            {CUSTOM_IDEAS.map((idea) => (
              <button key={idea} type="button" className="idea-chip" onClick={() => onCustomChange(idea)}>
                {idea}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <button type="submit" className="btn btn-block" disabled={busy || !file}>
        {busy && <span className="spinner" />}
        {status ?? "✨ Generate captions"}
      </button>
      {error && <p className="notice error">{error}</p>}
      <p className="muted small">Photos are public once posted. Don&apos;t upload people who didn&apos;t agree to it.</p>
    </form>
  );
}
