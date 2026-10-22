import { getUserAndProfile } from "@/lib/auth";
import { getChallenge } from "@/lib/daily";
import { getDeck } from "@/lib/feed";
import DailyChallenge from "./DailyChallenge";
import SwipeDeck from "./SwipeDeck";

export const dynamic = "force-dynamic";

// Home: today's challenge, then one caption at a time, swipe to rate. Public, but voting needs an account.
export default async function Home() {
  const { supabase, user, profile } = await getUserAndProfile();
  const [{ cards, error }, challenge] = await Promise.all([
    getDeck(supabase, user?.id),
    getChallenge(supabase, user?.id),
  ]);

  return (
    <main className="page">
      <DailyChallenge challenge={challenge} signedIn={Boolean(user)} firstName={profile?.first_name} />

      {error ? (
        <p className="notice error">Couldn&apos;t load captions: {error.message}</p>
      ) : (
        <SwipeDeck cards={cards} userId={user?.id ?? null} votedToday={challenge.votesToday} />
      )}
    </main>
  );
}
