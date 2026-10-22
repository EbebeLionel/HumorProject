"use client";

import { useRouter } from "next/navigation";
import DeleteImageButton from "./DeleteImageButton";

type Props = {
  imageId: string;
  redirectTo?: string;
  large?: boolean;
  label?: string;
};

// Delete control for server-rendered cards: refreshes the page, or navigates away
// when the page itself was about the deleted photo
export default function OwnerDelete({ imageId, redirectTo, large, label }: Props) {
  const router = useRouter();

  return (
    <DeleteImageButton
      imageId={imageId}
      large={large}
      label={label}
      onDeleted={() => (redirectTo ? router.push(redirectTo) : router.refresh())}
    />
  );
}
