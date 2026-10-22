"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getVibeLabel } from "@/lib/captions";
import type { DeckCard } from "@/lib/feed";
import DeleteImageButton from "./DeleteImageButton";
import { castVote } from "./vote/actions";

type Decision = "like" | "dislike" | "skip";
type Direction = "right" | "left" | "up";

const DIRECTION: Record<Decision, Direction> = { like: "right", dislike: "left", skip: "up" };
const SWIPE_THRESHOLD = 110;
const LEAVE_MS = 320;

function formatDate(iso: string) {
  // Fixed time zone so server and browser render the same text
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

type Props = {
  cards: DeckCard[];
  userId: string | null;
  votedToday: number;
};

export default function SwipeDeck({ cards, userId, votedToday }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState(cards);
  const [tally, setTally] = useState({ funny: 0, notFunny: 0, withCrowd: 0, judged: 0 });
  const [openingResults, setOpeningResults] = useState(false);
  const pendingVotes = useRef(new Set<Promise<unknown>>());
  const [skipped, setSkipped] = useState<DeckCard[]>([]);
  const [seen, setSeen] = useState(0);
  const [leaving, setLeaving] = useState<Direction | null>(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const current = queue[0];
  const next = queue[1];
  const total = seen + queue.length;

  function decide(decision: Decision) {
    if (!current || leaving) return;

    if (decision !== "skip" && !userId) {
      setDrag({ dx: 0, dy: 0 });
      setShowGate(true);
      return;
    }

    const card = current;
    setLeaving(DIRECTION[decision]);

    if (decision === "skip") {
      setSkipped((prev) => [...prev, card]);
    } else {
      const vote = decision === "like" ? 1 : -1;
      const request = castVote(card.caption.id, vote).then((result) => {
        pendingVotes.current.delete(request);
        if ("error" in result) {
          setStatus({ text: result.error, error: true });
          if (result.signedOut) setShowGate(true);
          return;
        }
        // Compare with everyone else's votes (not counting this one)
        const othersUp = result.upvotes - (vote === 1 ? 1 : 0);
        const othersDown = result.downvotes - (vote === -1 ? 1 : 0);
        const crowd = Math.sign(othersUp - othersDown);
        setTally((prev) => ({
          funny: prev.funny + (vote === 1 ? 1 : 0),
          notFunny: prev.notFunny + (vote === -1 ? 1 : 0),
          judged: prev.judged + (crowd !== 0 ? 1 : 0),
          withCrowd: prev.withCrowd + (crowd === vote ? 1 : 0),
        }));
        setStatus({
          text: `${vote === 1 ? "😂 Funny" : "😐 Not funny"} · ${result.upvotes} funny / ${result.downvotes} not so far`,
        });
      });
      pendingVotes.current.add(request);
    }

    setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      setSeen((n) => n + 1);
      setLeaving(null);
      setDrag({ dx: 0, dy: 0 });
    }, LEAVE_MS);
  }

  // Keyboard: ← not funny, → funny, ↑/↓ skip
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.metaKey || event.ctrlKey || event.altKey || target.closest("input, textarea, select")) return;
      const decision: Decision | undefined = (
        { ArrowRight: "like", ArrowLeft: "dislike", ArrowUp: "skip", ArrowDown: "skip" } as const
      )[event.key as "ArrowRight"];
      if (decision) {
        event.preventDefault();
        decide(decision);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (leaving || (event.target as HTMLElement).closest("a, button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!dragStart.current) return;
    setDrag({ dx: event.clientX - dragStart.current.x, dy: event.clientY - dragStart.current.y });
  }

  function onPointerUp() {
    if (!dragStart.current) return;
    dragStart.current = null;
    setDragging(false);

    if (drag.dx > SWIPE_THRESHOLD) decide("like");
    else if (drag.dx < -SWIPE_THRESHOLD) decide("dislike");
    else if (drag.dy < -SWIPE_THRESHOLD) decide("skip");
    else setDrag({ dx: 0, dy: 0 });
  }

  function removeImage(imageId: string) {
    const keep = (card: DeckCard) => card.image.id !== imageId;
    setQueue((prev) => prev.filter(keep));
    setSkipped((prev) => prev.filter(keep));
    setStatus({ text: "🗑 Photo deleted" });
  }

  function revisitSkipped() {
    setQueue(skipped);
    setSkipped([]);
    setSeen(0);
  }

  // Auto-hide the status line
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  // Let the last votes land before the results page reads them
  async function openResults() {
    setOpeningResults(true);
    await Promise.allSettled([...pendingVotes.current]);
    router.push("/recap");
  }

  if (!current) {
    const votedThisRound = tally.funny + tally.notFunny;
    const hasResults = Boolean(userId) && votedThisRound + votedToday > 0;

    return (
      <>
        <section className="panel empty">
          <div className="empty-emoji">{votedThisRound > 0 ? "🏁" : total === 0 && skipped.length === 0 ? "📭" : "🎉"}</div>
          <h2 className="glow-title">
            {votedThisRound > 0
              ? "Round complete!"
              : total === 0 && skipped.length === 0
                ? "No new captions to rate"
                : "You're all caught up!"}
          </h2>

          {votedThisRound > 0 ? (
            <div className="stat-row round-stats">
              <div className="stat">
                <strong>{tally.funny}</strong>
                <span>😂 funny</span>
              </div>
              <div className="stat">
                <strong>{tally.notFunny}</strong>
                <span>😐 not funny</span>
              </div>
              <div className="stat">
                <strong>{tally.judged ? `${Math.round((tally.withCrowd / tally.judged) * 100)}%` : "–"}</strong>
                <span>🤝 agreed with campus</span>
              </div>
            </div>
          ) : (
            <p>
              {userId
                ? "Post a photo to give everyone something new to swipe on, or check today's funniest captions."
                : "Log in to post your own photos and vote on captions."}
            </p>
          )}

          <div className="row" style={{ justifyContent: "center" }}>
            {hasResults && (
              <button type="button" className="btn" onClick={openResults} disabled={openingResults}>
                {openingResults && <span className="spinner" />}
                📊 See your results
              </button>
            )}
            {skipped.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={revisitSkipped}>
                ↺ Revisit {skipped.length} skipped
              </button>
            )}
            <Link href={userId ? "/create" : "/login"} className={hasResults ? "btn btn-ghost" : "btn"}>
              {userId ? "📸 Post a photo" : "Log in"}
            </Link>
            <Link href="/top?sort=today" className="btn btn-ghost">
              🏆 Leaderboard
            </Link>
          </div>
        </section>
        {status && <div className={status.error ? "toast error" : "toast"}>{status.text}</div>}
      </>
    );
  }

  const likeOpacity = Math.min(Math.max(drag.dx / SWIPE_THRESHOLD, 0), 1);
  const nopeOpacity = Math.min(Math.max(-drag.dx / SWIPE_THRESHOLD, 0), 1);
  const topStyle =
    leaving === null ? { transform: `translate(${drag.dx}px, ${drag.dy * 0.3}px) rotate(${drag.dx / 18}deg)` } : undefined;

  return (
    <div className="deck">
      <div className="deck-progress" aria-label={`Caption ${seen + 1} of ${total}`}>
        <span>
          {seen + 1} / {total}
        </span>
        <div className="deck-progress-bar">
          <span style={{ width: `${(seen / Math.max(total, 1)) * 100}%` }} />
        </div>
      </div>

      <div className="deck-stage">
        {next && (
          <article key={next.caption.id} className="swipe-card is-behind" aria-hidden="true">
            <CardFace card={next} />
          </article>
        )}

        <article
          key={current.caption.id}
          className={[
            "swipe-card is-top",
            dragging ? "" : "animating",
            leaving ? `leave-${leaving}` : "",
          ].join(" ")}
          style={topStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="stamp stamp-like" style={{ opacity: leaving === "right" ? 1 : likeOpacity }}>
            FUNNY
          </div>
          <div className="stamp stamp-nope" style={{ opacity: leaving === "left" ? 1 : nopeOpacity }}>
            NOPE
          </div>
          <CardFace
            card={current}
            owner={
              current.image.user_id === userId ? (
                <DeleteImageButton
                  imageId={current.image.id}
                  onDeleted={() => removeImage(current.image.id)}
                  onError={(text) => setStatus({ text, error: true })}
                />
              ) : null
            }
          />
        </article>

        {showGate && (
          <div className="gate" role="dialog" aria-label="Log in to vote">
            <div style={{ fontSize: "2.5rem" }}>🔒</div>
            <h2>Log in to vote</h2>
            <p>Votes decide the leaderboard, so they&apos;re for members only. Skipping is always free.</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <Link href="/login" className="btn">Log in</Link>
              <Link href="/login?mode=signup" className="btn btn-ghost">Sign up</Link>
            </div>
            <button type="button" className="nav-signout" onClick={() => setShowGate(false)}>
              Keep browsing
            </button>
          </div>
        )}
      </div>

      <div className="deck-actions">
        <button type="button" className="round-btn nope" onClick={() => decide("dislike")} disabled={Boolean(leaving)}>
          <span className="circle" aria-hidden="true">✕</span>
          Not funny
        </button>
        <button type="button" className="round-btn skip" onClick={() => decide("skip")} disabled={Boolean(leaving)}>
          <span className="circle" aria-hidden="true">↷</span>
          Skip
        </button>
        <button type="button" className="round-btn like" onClick={() => decide("like")} disabled={Boolean(leaving)}>
          <span className="circle" aria-hidden="true">😂</span>
          Funny
        </button>
      </div>

      <p className="deck-hint">
        Swipe or use <kbd>←</kbd> not funny · <kbd>↑</kbd> skip · <kbd>→</kbd> funny
      </p>

      {status && <div className={status.error ? "toast error" : "toast"}>{status.text}</div>}
    </div>
  );
}

function CardFace({ card, owner }: { card: DeckCard; owner?: React.ReactNode }) {
  const { image, caption } = card;
  const vibe = getVibeLabel(image.vibe);

  return (
    <>
      <div className="swipe-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.image_url} alt="" className="swipe-photo-blur" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.image_url} alt="User-submitted photo" className="swipe-photo-main" draggable={false} />
        <div className="swipe-top-meta">
          <div className="chips">
            {vibe && (
              <span className="chip" title={vibe.label}>
                {vibe.emoji} {vibe.label}
              </span>
            )}
            {image.theme && <span className="chip chip-pink">📅 {image.theme}</span>}
          </div>
          {owner}
        </div>
      </div>
      <div className="swipe-body">
        <p className="swipe-caption">{caption.content}</p>
        <div className="swipe-footer">
          <time dateTime={image.created_at}>{formatDate(image.created_at)}</time>
          <Link href={`/i/${image.id}`} className="text-link">
            All captions ↗
          </Link>
        </div>
      </div>
    </>
  );
}
