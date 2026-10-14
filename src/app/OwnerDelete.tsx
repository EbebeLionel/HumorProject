"use client";

import { useRouter } from "next/navigation";
import DeleteImageButton from "./DeleteImageButton";

// Delete control for server-rendered cards: refreshes the page, or navigates away
// when the page itself was about the deleted photo
export default function OwnerDelete({ imageId, redirectTo }: { imageId: string; redirectTo?: string }) {
  const router = useRouter();

  return (
    <DeleteImageButton
      imageId={imageId}
      onDeleted={() => (redirectTo ? router.push(redirectTo) : router.refresh())}
    />
  );
}
