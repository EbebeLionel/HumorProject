import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getMyImages } from "@/lib/feed";
import OwnerDelete from "../OwnerDelete";
import { updateName } from "../onboarding/actions";
import NameForm from "../onboarding/NameForm";
import AvatarUploader from "./AvatarUploader";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }

  const myImages = await getMyImages(supabase, user.id);
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <main className="page">
      <section className="panel profile-head">
        <AvatarUploader
          userId={user.id}
          avatarUrl={profile?.avatar_url ?? null}
          initial={(profile?.first_name ?? user.email ?? "?").charAt(0).toUpperCase()}
        />
        <div>
          <h1 className="glow-title">{fullName || "Your profile"}</h1>
          <p className="muted">{user.email}</p>
        </div>
      </section>

      <section className="panel">
        <h2>Name</h2>
        <NameForm
          action={updateName}
          firstName={profile?.first_name ?? null}
          lastName={profile?.last_name ?? null}
          submitLabel="Save"
        />
      </section>

      <section className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Your posts ({myImages.length})</h2>
          {myImages.length > 0 && (
            <Link href="/mine" className="text-link small">Manage &amp; delete →</Link>
          )}
        </div>
        {myImages.length === 0 ? (
          <p className="muted">
            Nothing yet. <Link href="/create" className="text-link">Caption your first photo →</Link>
          </p>
        ) : (
          <div className="mini-grid">
            {myImages.map((image) => {
              const best = image.captions[0];
              return (
                <div key={image.id} className="mini-card">
                  <Link href={`/i/${image.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.image_url} alt={best?.content ?? "Your photo"} loading="lazy" />
                  </Link>
                  <div className="mini-meta">
                    <span>▲ {best ? best.score : 0}</span>
                    <OwnerDelete imageId={image.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Password</h2>
        <p className="muted small" style={{ marginBottom: "0.85rem" }}>
          Signed up with Google? Set a password to also log in with your email.
        </p>
        <PasswordForm />
      </section>
    </main>
  );
}
