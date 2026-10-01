import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasName, type Profile } from "@/lib/profile";

// Google redirects here (via Supabase) with a one-time ?code=
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  // First sign-in (or names never filled in): ask for first/last name
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  const destination = hasName(profile) ? "/members" : "/onboarding";
  return NextResponse.redirect(new URL(destination, request.url));
}
