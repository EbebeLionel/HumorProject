import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { getDailyTheme } from "@/lib/captions";
import { getDayBoard, getDayWinners } from "@/lib/daily";
import { getFeed, getMyVotes, SORTS, type Sort } from "@/lib/feed";
import ImageCard from "../ImageCard";

export const dynamic = "force-dynamic";

const TABS = ["today", "yesterday", ...SORTS] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  today: "📅 Today's challenge",
  yesterday: "🥇 Yesterday's winners",
  hot: "🔥 Hot this week",
  new: "🆕 New",
  top: "🏆 All-time top",
};

// Leaderboard: photos ranked by their funniest caption, per daily challenge or overall
export default async function TopPage({ searchParams }: PageProps<"/top">) {
  const { supabase, user } = await getUserAndProfile();
  const { sort: sortParam } = await searchParams;
  const tab: Tab = TABS.includes(sortParam as Tab) ? (sortParam as Tab) : "today";

  const dayOffset = tab === "today" ? 0 : tab === "yesterday" ? -1 : null;
  const [{ images, error }, podium] = await Promise.all([
    dayOffset === null ? getFeed(supabase, tab as Sort) : getDayBoard(supabase, dayOffset),
    tab === "yesterday" ? getDayWinners(supabase, -1, 3) : null,
  ]);
  const myVotes = await getMyVotes(supabase, user?.id, images);
  const theme = dayOffset === null ? null : getDailyTheme(dayOffset);

  return (
    <main className="page page-wide">
      <header className="page-head">
        <h1>Leaderboard</h1>
        <p>
          {theme
            ? tab === "today"
              ? `Today's theme is “${theme.name}”. Photos posted today, ranked by their funniest caption. Voting closes at midnight.`
              : `Yesterday's theme was “${theme.name}”. These jokes won the day.`
            : "The captions campus voted funniest. Tap a photo for the full set."}
        </p>
      </header>

      <nav className="tabs" aria-label="Leaderboard view">
        {TABS.map((t) => (
          <Link key={t} href={`/top?sort=${t}`} className={t === tab ? "tab tab-active" : "tab"}>
            {TAB_LABELS[t]}
          </Link>
        ))}
      </nav>

      {podium && podium.winners.length > 0 && (
        <ol className="podium">
          {podium.winners.map((caption, i) => (
            <li key={caption.id} className={`podium-place place-${i + 1}`}>
              <span className="podium-medal">{["🥇", "🥈", "🥉"][i]}</span>
              {caption.images && (
                <Link href={`/i/${caption.images.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={caption.images.image_url} alt="" loading="lazy" />
                </Link>
              )}
              <p>{caption.content}</p>
              <span className="muted small">▲ {caption.score}</span>
            </li>
          ))}
        </ol>
      )}

      {error ? (
        <p className="notice error">Couldn&apos;t load the leaderboard: {error.message}</p>
      ) : images.length === 0 ? (
        <section className="panel empty">
          <div className="empty-emoji">{tab === "today" ? "📅" : "🏆"}</div>
          <h2 className="glow-title">
            {tab === "today"
              ? "No entries yet today"
              : tab === "yesterday"
                ? "Nobody posted yesterday"
                : tab === "new"
                  ? "Nothing here yet"
                  : "No upvoted captions yet"}
          </h2>
          <p>
            {tab === "today"
              ? "Post the first photo for today's theme and you're automatically in first place."
              : "Be the first: rate some captions on the home page or post a photo."}
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href={user ? "/create" : "/login"} className="btn">📸 Post a photo</Link>
            <Link href="/" className="btn btn-ghost">Start swiping</Link>
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
