"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn } from "@/lib/auth";

// Called by the login form after an email/password sign-in succeeds in the browser
export async function afterPasswordSignIn(): Promise<{ destination: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { destination: "/login" };
  }

  const destination = await finishSignIn(supabase, user);
  revalidatePath("/", "layout");
  return { destination };
}
