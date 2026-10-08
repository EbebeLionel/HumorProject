import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { getThemeOfTheDay } from "@/lib/captions";
import { getFeed, getMyVotes, SORTS, type Sort } from "@/lib/feed";
import ImageCard from "./ImageCard";

export const dynamic = "force-dynamic";

const SORT_LABELS: Record<Sort, string> = { hot: "🔥 Hot this week", new: "🆕 New", top: "🏆 All-time top" };

export default async function Home({ searchParams }: PageProps<"/">) {
  const { supabase, user } = await getUserAndProfile();
  const { sort: sortParam } = await searchParams;
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "hot";

  const { images, error } = await getFeed(supabase, sort);
  const myVotes = await getMyVotes(supabase, user?.id, images);

  return (
    <main className="wide">
      <section className="hero">
        <p className="muted">Today&apos;s theme</p>
        <h1>{getThemeOfTheDay()}</h1>
        <p>
          Snap something that fits the theme, let AI caption it, and let campus vote on the funniest line.
        </p>
        <p>
          <Link href={user ? "/create" : "/login"} className="button">
            {user ? "📸 Caption a photo" : "Sign in to post & vote"}
          </Link>
        </p>
      </section>

      <nav className="tabs" aria-label="Sort feed">
        {SORTS.map((s) => (
          <Link key={s} href={`/?sort=${s}`} className={s === sort ? "tab tab-active" : "tab"}>
            {SORT_LABELS[s]}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="error">Couldn&apos;t load the feed: {error.message}</p>
      ) : images.length === 0 ? (
        <p className="muted">
          {sort === "new" ? "Nothing here yet." : "No upvoted captions yet."} Be the first:{" "}
          <Link href={user ? "/create" : "/login"}>post a photo</Link>
          {sort !== "new" && (
            <>
              {" "}or <Link href="/?sort=new">vote on new ones</Link>
            </>
          )}
          .
        </p>
      ) : (
        <div className="feed">
          {images.map((image) => (
            <ImageCard key={image.id} image={image} myVotes={myVotes} signedIn={Boolean(user)} />
          ))}
        </div>
      )}
    </main>
  );
}
