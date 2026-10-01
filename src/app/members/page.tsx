import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { hasName } from "@/lib/profile";

type Joke = {
  id: number;
  setup: string;
  punchline: string;
};

// Members-only: the proxy redirects signed-out visitors to /login
export default async function MembersPage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }
  if (!hasName(profile)) {
    redirect("/onboarding");
  }

  const { data: jokes } = await supabase
    .from("jokes")
    .select("id, setup, punchline")
    .order("id")
    .returns<Joke[]>();

  // Rotate through the jokes once per day
  const dayNumber = Math.floor(new Date().getTime() / 86_400_000);
  const joke = jokes?.length ? jokes[dayNumber % jokes.length] : null;

  return (
    <main>
      <h1>Members lounge</h1>
      <p>Welcome back, {profile!.first_name}! Only signed-in users can see this page.</p>

      <section>
        <h2>Members-only joke of the day</h2>
        {joke ? (
          <p>
            <strong>{joke.setup}</strong> {joke.punchline}
          </p>
        ) : (
          <p>No jokes yet.</p>
        )}
      </section>

      <p>
        <Link href="/profile">Edit your profile →</Link>
      </p>
    </main>
  );
}
