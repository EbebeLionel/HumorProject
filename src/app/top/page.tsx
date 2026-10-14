import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { getFeed, getMyVotes, SORTS, type Sort } from "@/lib/feed";
import ImageCard from "../ImageCard";

export const dynamic = "force-dynamic";

const SORT_LABELS: Record<Sort, string> = { hot: "🔥 Hot this week", new: "🆕 New", top: "🏆 All-time top" };

// Leaderboard: photos ranked by their funniest caption
export default async function TopPage({ searchParams }: PageProps<"/top">) {
  const { supabase, user } = await getUserAndProfile();
  const { sort: sortParam } = await searchParams;
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "hot";

  const { images, error } = await getFeed(supabase, sort);
  const myVotes = await getMyVotes(supabase, user?.id, images);

  return (
    <main className="page page-wide">
      <header className="page-head">
        <h1>Leaderboard</h1>
        <p>The captions campus voted funniest. Tap a photo for the full set.</p>
      </header>

      <nav className="tabs" aria-label="Sort leaderboard">
        {SORTS.map((s) => (
          <Link key={s} href={`/top?sort=${s}`} className={s === sort ? "tab tab-active" : "tab"}>
            {SORT_LABELS[s]}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="notice error">Couldn&apos;t load the leaderboard: {error.message}</p>
      ) : images.length === 0 ? (
        <section className="panel empty">
          <div className="empty-emoji">🏆</div>
          <h2 className="glow-title">{sort === "new" ? "Nothing here yet" : "No upvoted captions yet"}</h2>
          <p>Be the first: rate some captions on the home page or post a photo.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/" className="btn">Start swiping</Link>
            <Link href={user ? "/create" : "/login"} className="btn btn-ghost">📸 Post a photo</Link>
          </div>
        </section>
      ) : (
        <div className="feed">
          {images.map((image) => (
            <ImageCard key={image.id} image={image} myVotes={myVotes} userId={user?.id ?? null} showRanks />
          ))}
        </div>
      )}
    </main>
  );
}
