import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getThemeOfTheDay } from "@/lib/captions";
import CreateForm from "./CreateForm";

export default async function CreatePage() {
  const { user } = await getUserAndProfile();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page">
      <header className="page-head">
        <h1>Caption a photo</h1>
        <p>
          Today&apos;s theme: <strong>{getThemeOfTheDay()}</strong>. Upload a photo, pick a vibe (or invent your
          own), and AI writes four captions for everyone to swipe on.
        </p>
      </header>
      <section className="panel">
        <CreateForm userId={user.id} />
      </section>
    </main>
  );
}
