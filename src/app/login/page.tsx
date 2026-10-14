import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import LoginCard from "./LoginCard";
import "./login.css";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { user } = await getUserAndProfile();
  if (user) {
    redirect("/");
  }

  const { error, mode } = await searchParams;

  return (
    <LoginCard
      initialMode={mode === "signup" ? "signup" : "login"}
      initialError={error ? `Sign-in failed (${String(error)}). Please try again.` : null}
    />
  );
}
