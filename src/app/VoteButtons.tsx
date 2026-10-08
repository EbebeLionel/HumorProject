"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { castVote } from "./vote/actions";

type Props = {
  captionId: string;
  initialVote: -1 | 0 | 1;
  initialUpvotes: number;
  initialDownvotes: number;
  signedIn: boolean;
};

export default function VoteButtons({ captionId, initialVote, initialUpvotes, initialDownvotes, signedIn }: Props) {
  const [vote, setVote] = useState(initialVote);
  const [counts, setCounts] = useState({ up: initialUpvotes, down: initialDownvotes });
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [pending, startTransition] = useTransition();

  function onVote(clicked: 1 | -1) {
    if (!signedIn) {
      setShowSignIn(true);
      return;
    }

    // Clicking your current vote again removes it
    const next = vote === clicked ? 0 : clicked;
    const previous = { vote, counts };

    // Optimistic update so voting feels instant
    setVote(next);
    setCounts({
      up: counts.up - (vote === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      down: counts.down - (vote === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
    });
    setError(null);

    startTransition(async () => {
      const result = await castVote(captionId, next);
      if ("error" in result) {
        setVote(previous.vote);
        setCounts(previous.counts);
        setError(result.error);
        setShowSignIn(Boolean(result.signedOut));
      } else {
        setVote(result.vote);
        setCounts({ up: result.upvotes, down: result.downvotes });
      }
    });
  }

  const score = counts.up - counts.down;

  return (
    <div className="vote">
      <button
        type="button"
        className={`vote-btn${vote === 1 ? " vote-up" : ""}`}
        onClick={() => onVote(1)}
        disabled={pending}
        aria-pressed={vote === 1}
        aria-label="Upvote"
        title="Funny"
      >
        ▲
      </button>
      <span className="vote-score" title={`${counts.up} up · ${counts.down} down`}>
        {score}
      </span>
      <button
        type="button"
        className={`vote-btn${vote === -1 ? " vote-down" : ""}`}
        onClick={() => onVote(-1)}
        disabled={pending}
        aria-pressed={vote === -1}
        aria-label="Downvote"
        title="Not funny"
      >
        ▼
      </button>
      {showSignIn && (
        <span className="vote-hint">
          <Link href="/login">Sign in</Link> to vote
        </span>
      )}
      {error && !showSignIn && <span className="error vote-hint">{error}</span>}
    </div>
  );
}
