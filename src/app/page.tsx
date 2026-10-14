import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { getThemeOfTheDay } from "@/lib/captions";
import { getDeck } from "@/lib/feed";
import SwipeDeck from "./SwipeDeck";

export const dynamic = "force-dynamic";

// Home: one caption at a time, swipe to rate. Public, but voting needs an account.
export default async function Home() {
  const { supabase, user, profile } = await getUserAndProfile();
  const { cards, error } = await getDeck(supabase, user?.id);

  return (
    <main className="page">
      <section className="panel theme-banner">
        <div>
          <p className="eyebrow">{profile?.first_name ? `Hey ${profile.first_name} · ` : ""}Today&apos;s theme</p>
          <strong>{getThemeOfTheDay()}</strong>
        </div>
        <Link href={user ? "/create" : "/login?mode=signup"} className="btn btn-sm">
          {user ? "📸 Post one" : "Join to post"}
        </Link>
      </section>

      {error ? (
        <p className="notice error">Couldn&apos;t load captions: {error.message}</p>
      ) : (
        <SwipeDeck cards={cards} userId={user?.id ?? null} />
      )}
    </main>
  );
}
