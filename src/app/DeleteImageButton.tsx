"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteImage } from "./i/actions";

type Props = {
  imageId: string;
  onDeleted: () => void;
  onError?: (message: string) => void;
  large?: boolean; // full-size red button instead of the small overlay pill
  label?: string;
};

// Only rendered for the photo's uploader. First tap arms it, second tap deletes.
export default function DeleteImageButton({ imageId, onDeleted, onError, large, label = "Delete" }: Props) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Disarm if the user doesn't confirm within a few seconds
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  function onClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (!armed) {
      setArmed(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteImage(imageId);
      setArmed(false);
      if ("error" in result) {
        (onError ?? alert)(result.error);
      } else {
        onDeleted();
      }
    });
  }

  return (
    <button
      type="button"
      className={large ? `btn btn-danger btn-sm${armed ? " confirm" : ""}` : armed ? "delete-btn confirm" : "delete-btn"}
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      disabled={pending}
      title="Delete your photo"
    >
      🗑 {pending ? "Deleting…" : armed ? "Tap again to delete" : label}
    </button>
  );
}
