import Link from "next/link";
import { DAILY_VOTE_GOAL, type Challenge } from "@/lib/daily";

type Props = {
  challenge: Challenge;
  signedIn: boolean;
  firstName?: string | null;
};

// Home page banner: today's theme, the user's progress on it, and yesterday's winner
export default function DailyChallenge({ challenge, signedIn, firstName }: Props) {
  const { theme, yesterdayTheme, yesterdayWinner } = challenge;
  const votesDone = Math.min(challenge.votesToday, DAILY_VOTE_GOAL);
  const steps = [
    { done: votesDone >= DAILY_VOTE_GOAL, label: `Rate ${DAILY_VOTE_GOAL} captions`, detail: `${votesDone}/${DAILY_VOTE_GOAL}` },
    { done: challenge.postedToday, label: "Post a photo for today's theme", href: "/create" },
  ];
  const complete = signedIn && steps.every((step) => step.done);

  return (
    <section className="panel challenge">
      <div className="challenge-head">
        <p className="eyebrow">
          {firstName ? `Hey ${firstName} · ` : ""}Daily challenge · ends in {challenge.hoursLeft}h {challenge.minutesLeft}m
        </p>
        {signedIn && challenge.streak > 0 && (
          <span className="streak" title="Days in a row you voted or posted">
            🔥 {challenge.streak}-day streak{!challenge.activeToday && " · play today to keep it"}
          </span>
        )}
      </div>

      <h2 className="challenge-theme">{theme.name}</h2>
      <p className="challenge-blurb">{theme.blurb}</p>

      {signedIn ? (
        <ul className="challenge-steps">
          {steps.map((step) => (
            <li key={step.label} className={step.done ? "done" : ""}>
              <span className="check" aria-hidden="true">{step.done ? "✓" : ""}</span>
              {step.href && !step.done ? (
                <Link href={step.href} className="text-link">{step.label}</Link>
              ) : (
                step.label
              )}
              {step.detail && <span className="muted small">{step.detail}</span>}
            </li>
          ))}
          {complete && <li className="done challenge-complete">🎉 Challenge complete. See you tomorrow!</li>}
        </ul>
      ) : (
        <div className="row">
          <Link href="/login?mode=signup" className="btn btn-sm">Join to play</Link>
        </div>
      )}

      <Link href="/top?sort=yesterday" className="winner">
        {yesterdayWinner?.images ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={yesterdayWinner.images.image_url} alt="" />
            <div>
              <span className="winner-label">🥇 Yesterday&apos;s winner · {yesterdayTheme.name}</span>
              <p>{yesterdayWinner.content}</p>
              <span className="muted small">▲ {yesterdayWinner.score} · see all winners →</span>
            </div>
          </>
        ) : (
          <div>
            <span className="winner-label">🥇 Yesterday · {yesterdayTheme.name}</span>
            <p className="muted small">No winner yesterday. Today&apos;s top caption could be the first →</p>
          </div>
        )}
      </Link>
    </section>
  );
}
