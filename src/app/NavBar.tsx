import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import Logo from "./Logo";
import NavLinks from "./NavLinks";

export default async function NavBar() {
  const { user, profile } = await getUserAndProfile();
  const name = profile?.first_name || user?.email || "";

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <Logo className="brand-mark" />
        The Humor Project
      </Link>

      <NavLinks signedIn={Boolean(user)} />

      <div className="nav-right">
        {user ? (
          <>
            <Link href="/profile" className="nav-user" title="Your profile">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="avatar avatar-sm" />
              ) : (
                <span className="avatar avatar-sm avatar-placeholder">{name.charAt(0).toUpperCase()}</span>
              )}
              <span className="nav-user-name">{name}</span>
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="nav-signout">Log out</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn btn-sm">Log in</Link>
        )}
      </div>
    </nav>
  );
}
