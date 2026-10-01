import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import GoogleSignInButton from "./GoogleSignInButton";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { user } = await getUserAndProfile();
  if (user) {
    redirect("/members");
  }

  const { error } = await searchParams;

  return (
    <main>
      <h1>Sign in</h1>
      <p>Sign in to see the members-only area and edit your profile.</p>
      {error && <p className="error">Sign-in failed ({String(error)}). Please try again.</p>}
      <GoogleSignInButton />
    </main>
  );
}
