import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getImage, getMyVotes } from "@/lib/feed";
import ImageCard from "../../ImageCard";
import OwnerDelete from "../../OwnerDelete";

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
    <main className="page">
      {isNew && user?.id === image.user_id && (
        <div className="notice posted-notice">
          <p>🎉 Posted! Vote for your favorite caption, then send this page to your group chat.</p>
          <div className="row">
            <span className="muted small">Wrong photo?</span>
            <OwnerDelete imageId={image.id} redirectTo="/create" large label="Delete this post" />
          </div>
        </div>
      )}
      <ImageCard image={image} myVotes={myVotes} userId={user?.id ?? null} linkToDetail={false} />
      <div className="row">
        <Link href="/" className="btn btn-ghost btn-sm">← Back to swiping</Link>
        {user && (
          <Link href="/create" className="btn btn-sm">📸 Caption another photo</Link>
        )}
      </div>
    </main>
  );
}
