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
    <main>
      <h1>Caption a photo</h1>
      <p>
        Today&apos;s theme: <strong>{getThemeOfTheDay()}</strong>. Upload a photo, pick a vibe, and AI will write
        four captions. Everyone can then vote on the funniest one.
      </p>
      <CreateForm userId={user.id} />
    </main>
  );
}
