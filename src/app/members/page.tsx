import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserAndProfile } from "@/lib/auth";
import { hasName } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  photo_count: number;
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

  const { data: members, error } = await supabase.rpc("list_members");
  const list = (members ?? []) as Member[];
  const totalPhotos = list.reduce((sum, m) => sum + Number(m.photo_count), 0);

  return (
    <main className="page page-wide">
      <header className="page-head">
        <h1>Members</h1>
        <p>Welcome back, {profile!.first_name}! Only signed-in members can see this page.</p>
      </header>

      <div className="stat-row">
        <div className="stat">
          <strong>{list.length}</strong>
          <span>members</span>
        </div>
        <div className="stat">
          <strong>{totalPhotos}</strong>
          <span>photos captioned</span>
        </div>
      </div>

      <section className="panel">
        <h2>Who&apos;s here</h2>
        {error ? (
          <p className="notice error">
            Couldn&apos;t load the member list ({error.message}). Run
            supabase/migrations/20261014000000_member_directory.sql in the Supabase SQL editor.
          </p>
        ) : (
          <ul className="member-list">
            {list.map((member) => {
              const name = [member.first_name, member.last_name].filter(Boolean).join(" ");
              const isMe = member.id === user.id;
              return (
                <li key={member.id} className={isMe ? "member me" : "member"}>
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar_url} alt="" className="avatar avatar-md" />
                  ) : (
                    <span className="avatar avatar-md avatar-placeholder">
                      {(member.first_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <div className="member-name">
                      {name}
                      {isMe && <span className="muted small"> (you)</span>}
                    </div>
                    <div className="member-sub">
                      {Number(member.photo_count)} photo{Number(member.photo_count) === 1 ? "" : "s"} · joined{" "}
                      {new Date(member.joined_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                        timeZone: "America/New_York",
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p>
        <Link href="/profile" className="text-link">Edit your profile →</Link>
      </p>
    </main>
  );
}
