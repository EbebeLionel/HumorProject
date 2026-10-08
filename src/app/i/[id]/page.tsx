import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getImage, getMyVotes } from "@/lib/feed";
import ImageCard from "../../ImageCard";

export const dynamic = "force-dynamic";

// Shareable page for a single photo and its captions
export default async function ImagePage({ params, searchParams }: PageProps<"/i/[id]">) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const { supabase, user } = await getUserAndProfile();

  const image = /^[0-9a-f-]{36}$/i.test(id) ? await getImage(supabase, id) : null;
  if (!image) {
    notFound();
  }

  const myVotes = await getMyVotes(supabase, user?.id, [image]);

  return (
    <main>
      {isNew && user?.id === image.user_id && (
        <p className="success">
          Posted! Vote for your favorite caption, then send this page to your group chat.
        </p>
      )}
      <ImageCard image={image} myVotes={myVotes} signedIn={Boolean(user)} linkToDetail={false} />
      <p>
        <Link href="/">← Back to the feed</Link>
        {user && (
          <>
            {" · "}
            <Link href="/create">Caption another photo</Link>
          </>
        )}
      </p>
    </main>
  );
}
