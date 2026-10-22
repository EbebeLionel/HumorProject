import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getChallenge, getTopCaptions } from "@/lib/daily";
import { getRecap, type Recap, type RecapItem } from "@/lib/recap";

export const dynamic = "force-dynamic";

const COMMUNITY_DAYS = 7;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

// A fun one-line read on how the user votes
function verdict(recap: Recap) {
  const total = recap.liked + recap.passed;
  if (recap.agreement !== null && recap.agreement >= 0.75) {
    return { title: "Crowd whisperer", text: "You laugh when campus laughs. Your taste is the leaderboard." };
  }
  if (recap.agreement !== null && recap.agreement <= 0.4) {
    return { title: "Contrarian comedian", text: "You and the crowd rarely agree. Either you're ahead of your time or you're wrong." };
  }
  if (total > 0 && recap.liked / total >= 0.75) {
    return { title: "Easy laugh", text: "You found most of it funny. Everyone wants you in their audience." };
  }
  if (total > 0 && recap.liked / total <= 0.25) {
    return { title: "Tough critic", text: "Hardly anything got past you. A caption that makes you laugh has truly earned it." };
  }
  return { title: "Independent thinker", text: "Sometimes with the crowd, sometimes not. Balanced, as all things should be." };
}

export default async function RecapPage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }

  const [{ recap, error }, challenge, { captions: community }] = await Promise.all([
    getRecap(supabase, user.id),
    getChallenge(supabase, user.id),
    getTopCaptions(supabase, COMMUNITY_DAYS, 5),
  ]);

  const total = recap.liked + recap.passed;
  const liked = new Set(recap.items.filter((item) => item.vote === 1).map((item) => item.caption.id));

  if (error) {
    return (
      <main className="page">
        <p className="notice error">Couldn&apos;t load your results: {error.message}</p>
      </main>
    );
  }

  if (total === 0) {
    return (
      <main className="page">
        <section className="panel empty">
          <div className="empty-emoji">🗳️</div>
          <h2 className="glow-title">No votes yet</h2>
          <p>Rate a few captions and your results show up here: favorites, hot takes, and how you compare with campus.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/" className="btn">Start swiping</Link>
          </div>
        </section>
      </main>
    );
  }

  const { title, text } = verdict(recap);

  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">
          {recap.scope === "today" ? `Today's round · ${challenge.theme.name}` : "Your latest votes"}
        </p>
        <h1>{profile?.first_name ? `${profile.first_name}, you're a…` : "You're a…"}</h1>
      </header>

      <section className="panel verdict">
        <h2 className="glow-title">{title}</h2>
        <p>{text}</p>
      </section>

      <div className="stat-row">
        <div className="stat">
          <strong>{total}</strong>
          <span>captions rated</span>
        </div>
        <div className="stat">
          <strong>{recap.liked}</strong>
          <span>😂 made you laugh</span>
        </div>
        <div className="stat">
          <strong>{recap.agreement === null ? "–" : percent(recap.agreement)}</strong>
          <span>🤝 agreed with campus</span>
        </div>
        <div className="stat">
          <strong>{challenge.streak}</strong>
          <span>🔥 day streak</span>
        </div>
      </div>

      {recap.favoriteVibe && (
        <p className="notice">
          Your sense of humor: <strong>{recap.favoriteVibe.emoji} {recap.favoriteVibe.label}</strong>. You laughed at{" "}
          {percent(recap.favoriteVibe.rate)} of those captions.
        </p>
      )}

      <section className="panel">
        <h2>Your favorites</h2>
        {recap.favorites.length === 0 ? (
          <p className="muted">Nothing made you laugh this round. Tough crowd.</p>
        ) : (
          <ol className="recap-list">
            {recap.favorites.map((item) => (
              <RecapRow key={item.caption.id} item={item} />
            ))}
          </ol>
        )}
      </section>

      {recap.hotTakes.length > 0 && (
        <section className="panel">
          <h2>Your hot takes</h2>
          <p className="muted small" style={{ marginBottom: "0.85rem" }}>Where you and campus disagreed.</p>
          <ol className="recap-list">
            {recap.hotTakes.map((item) => (
              <RecapRow key={item.caption.id} item={item} />
            ))}
          </ol>
        </section>
      )}

      <section className="panel">
        <h2>Community rankings</h2>
        <p className="muted small" style={{ marginBottom: "0.85rem" }}>
          Campus&apos;s funniest captions from the last {COMMUNITY_DAYS} days
          {recap.firstVotes > 0 && ` · you were the first vote on ${recap.firstVotes} caption${recap.firstVotes === 1 ? "" : "s"}`}
          .
        </p>
        {community.length === 0 ? (
          <p className="muted">No upvoted captions yet this week.</p>
        ) : (
          <ol className="recap-list ranked">
            {community.map((caption, i) => (
              <li key={caption.id} className="recap-item">
                <span className="recap-rank">{["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`}</span>
                {caption.images && (
                  <Link href={`/i/${caption.images.id}`} className="recap-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={caption.images.image_url} alt="" loading="lazy" />
                  </Link>
                )}
                <div className="recap-body">
                  <p>{caption.content}</p>
                  <span className="muted small">
                    ▲ {caption.score} · {caption.upvotes} funny / {caption.downvotes} not
                    {liked.has(caption.id) && <span className="chip chip-pink recap-chip">you laughed too</span>}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel challenge-next">
        <div>
          <p className="eyebrow">Up next</p>
          <strong>
            New theme in {challenge.hoursLeft}h {challenge.minutesLeft}m. Come back tomorrow to keep your streak.
          </strong>
        </div>
        <div className="row">
          {!challenge.postedToday && (
            <Link href="/create" className="btn btn-sm">📸 Post for “{challenge.theme.name}”</Link>
          )}
          <Link href="/top?sort=today" className="btn btn-ghost btn-sm">🏆 Today&apos;s leaderboard</Link>
        </div>
      </section>
    </main>
  );
}

function RecapRow({ item }: { item: RecapItem }) {
  const others = item.othersUp + item.othersDown;
  const funnyShare = others ? item.othersUp / others : 0;

  return (
    <li className="recap-item">
      <Link href={`/i/${item.image.id}`} className="recap-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image.image_url} alt="" loading="lazy" />
      </Link>
      <div className="recap-body">
        <p>{item.caption.content}</p>
        {others === 0 ? (
          <span className="muted small">You were the first to vote on this one.</span>
        ) : (
          <>
            <div
              className="crowd-bar"
              role="img"
              aria-label={`${percent(funnyShare)} of other voters found it funny`}
            >
              <span style={{ width: percent(funnyShare) }} />
            </div>
            <span className="muted small">
              You said {item.vote === 1 ? "😂 funny" : "😐 not funny"} · {percent(funnyShare)} of {others} other
              {others === 1 ? " voter" : " voters"} laughed
            </span>
          </>
        )}
      </div>
    </li>
  );
}
