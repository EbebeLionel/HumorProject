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
    redirect("/");
  }

  return (
    <main className="page">
      <section className="panel">
        <h1 className="glow-title">Welcome! 👋</h1>
        <p className="muted" style={{ margin: "0.4rem 0 1.25rem" }}>
          One quick thing before you start swiping: what should other members call you?
        </p>
        <NameForm
          action={completeOnboarding}
          firstName={profile?.first_name ?? null}
          lastName={profile?.last_name ?? null}
          submitLabel="Start swiping"
        />
      </section>
    </main>
  );
}
