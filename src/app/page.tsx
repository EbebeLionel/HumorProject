import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getUserAndProfile();

  return (
    <main>
      <h1>Hello World</h1>
      <p>
        <Link href="/jokes">View jokes</Link>
      </p>

      {user ? (
        <section>
          <p>You&apos;re signed in as {profile?.first_name || user.email}.</p>
          <p>
            <Link href="/members">Go to the members lounge →</Link>
          </p>
        </section>
      ) : (
        <section>
          <p>🔒 Sign in to unlock the members lounge and your profile.</p>
          <p>
            <Link href="/login">Sign in with Google →</Link>
          </p>
        </section>
      )}
    </main>
  );
}
