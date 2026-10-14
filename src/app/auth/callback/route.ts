import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finishSignIn } from "@/lib/auth";

// Google (and email confirmation / reset links) redirect here via Supabase with a one-time ?code=
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

  // Straight to the home feed, unless we still need the user's name
  const destination = await finishSignIn(supabase, data.user);
  return NextResponse.redirect(new URL(destination, request.url));
}
