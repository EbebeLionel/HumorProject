import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { hasName } from "@/lib/profile";
import { completeOnboarding } from "./actions";
import NameForm from "./NameForm";

export default async function OnboardingPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }
  if (hasName(profile)) {
    redirect("/members");
  }

  return (
    <main>
      <h1>Welcome! 👋</h1>
      <p>Before you continue, tell us your name.</p>
      <NameForm
        action={completeOnboarding}
        firstName={profile?.first_name ?? null}
        lastName={profile?.last_name ?? null}
        submitLabel="Continue"
      />
    </main>
  );
}
