import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasName, type Profile } from "@/lib/profile";

// Returns the signed-in user (or null) along with their profiles row
export async function getUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { supabase, user, profile };
}

// After sign-in: copy the name from the auth provider (Google's given/family name,
// or what was typed on the sign-up form) into profiles, so most people skip onboarding.
// Returns where to send the user next.
export async function finishSignIn(supabase: SupabaseClient, user: User): Promise<"/" | "/onboarding"> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (hasName(profile)) {
    return "/";
  }

  const meta = user.user_metadata ?? {};
  const fullName = String(meta.full_name ?? meta.name ?? "").trim();
  const [fullFirst = "", ...fullRest] = fullName.split(/\s+/);
  const firstName = String(meta.first_name ?? meta.given_name ?? fullFirst).trim();
  const lastName = String(meta.last_name ?? meta.family_name ?? fullRest.join(" ")).trim();

  if (!firstName || !lastName) {
    return "/onboarding";
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    first_name: profile?.first_name?.trim() || firstName,
    last_name: profile?.last_name?.trim() || lastName,
    updated_at: new Date().toISOString(),
  });

  return error ? "/onboarding" : "/";
}
