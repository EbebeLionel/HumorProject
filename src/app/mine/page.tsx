import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getVibeLabel } from "@/lib/captions";
import { getMyImages } from "@/lib/feed";
import OwnerDelete from "../OwnerDelete";

export const dynamic = "force-dynamic";

// Everything the user has posted, with an obvious way to delete each one
export default async function MyPostsPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }

  const images = await getMyImages(supabase, user.id);

  return (
    <main className="page page-wide">
      <header className="page-head">
        <h1>My posts</h1>
        <p>
          Uploaded the wrong photo? Delete it here. Its captions and votes are removed with it, and the file is
          erased from storage.
        </p>
      </header>

      {images.length === 0 ? (
        <section className="panel empty">
          <div className="empty-emoji">🗂️</div>
          <h2 className="glow-title">No posts yet</h2>
          <p>Photos you caption show up here.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/create" className="btn">📸 Caption a photo</Link>
          </div>
        </section>
      ) : (
        <ul className="my-posts">
          {images.map((image) => {
            const best = image.captions[0];
            const vibe = getVibeLabel(image.vibe);
            const votes = image.captions.reduce((sum, c) => sum + c.upvotes + c.downvotes, 0);
            return (
              <li key={image.id} className="panel my-post">
                <Link href={`/i/${image.id}`} className="my-post-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.image_url} alt={best?.content ?? "Your photo"} loading="lazy" />
                </Link>
                <div className="my-post-body">
                  <div className="chips">
                    {vibe && <span className="chip">{vibe.emoji} {vibe.label}</span>}
                    {image.theme && <span className="chip chip-pink">📅 {image.theme}</span>}
                  </div>
                  <p className="my-post-caption">{best?.content ?? "No captions"}</p>
                  <p className="muted small">
                    {image.captions.length} captions · {votes} votes · best ▲ {best?.score ?? 0} · posted{" "}
                    {new Date(image.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "America/New_York",
                    })}
                  </p>
                  <div className="row">
                    <Link href={`/i/${image.id}`} className="btn btn-ghost btn-sm">View</Link>
                    <OwnerDelete imageId={image.id} large />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
