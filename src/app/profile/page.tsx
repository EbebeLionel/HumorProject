import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { updateName } from "../onboarding/actions";
import NameForm from "../onboarding/NameForm";
import AvatarUploader from "./AvatarUploader";

export default async function ProfilePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Your profile</h1>
      <p className="muted">Signed in as {user.email}</p>

      <section>
        <h2>Photo</h2>
        <AvatarUploader userId={user.id} avatarUrl={profile?.avatar_url ?? null} />
      </section>

      <section>
        <h2>Name</h2>
        <NameForm
          action={updateName}
          firstName={profile?.first_name ?? null}
          lastName={profile?.last_name ?? null}
          submitLabel="Save"
        />
      </section>
    </main>
  );
}
