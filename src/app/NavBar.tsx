import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";

export default async function NavBar() {
  const { user, profile } = await getUserAndProfile();

  return (
    <nav className="nav">
      <Link href="/" className="brand">The Humor Project</Link>
      {user && <Link href="/create">Create</Link>}
      <Link href="/jokes">Jokes</Link>
      {user && <Link href="/members">Members</Link>}

      <div className="nav-right">
        {user ? (
          <>
            <Link href="/profile" className="nav-user">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="avatar avatar-sm" />
              ) : null}
              {profile?.first_name || user.email}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="link-button">Sign out</button>
            </form>
          </>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </div>
    </nav>
  );
}
