"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NameFormState = { error: string | null; saved?: boolean };

async function upsertName(formData: FormData): Promise<string | null> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (!firstName || !lastName) {
    return "Please enter both your first and last name.";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
  });

  return error ? error.message : null;
}

// Used by /onboarding: save then continue into the app
export async function completeOnboarding(
  _prev: NameFormState,
  formData: FormData
): Promise<NameFormState> {
  const error = await upsertName(formData);
  if (error) {
    return { error };
  }
  revalidatePath("/", "layout");
  redirect("/members");
}

// Used by /profile: save and stay on the page
export async function updateName(
  _prev: NameFormState,
  formData: FormData
): Promise<NameFormState> {
  const error = await upsertName(formData);
  if (error) {
    return { error };
  }
  revalidatePath("/", "layout");
  return { error: null, saved: true };
}
