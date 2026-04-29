import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const token = requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  const safeNext = next.startsWith("/") ? next : "/dashboard";
  const redirectTo = new URL(safeNext, requestUrl.origin);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const fail = new URL("/auth", requestUrl.origin);
    fail.searchParams.set(
      "error",
      "Supabase URL or anon key missing in environment.",
    );
    return NextResponse.redirect(fail);
  }

  try {
    const response = NextResponse.redirect(redirectTo);
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as CookieOptions);
          });
        },
      },
    });

    const otpType = type as
      | "signup"
      | "recovery"
      | "invite"
      | "magiclink"
      | "email_change"
      | "email"
      | null;

    if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      });

      if (error) {
        const fail = new URL("/auth", requestUrl.origin);
        fail.searchParams.set("error", error.message);
        return NextResponse.redirect(fail);
      }

      return response;
    }

    if (token && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token,
      });

      if (error) {
        const fail = new URL("/auth", requestUrl.origin);
        fail.searchParams.set("error", error.message);
        return NextResponse.redirect(fail);
      }

      return response;
    }

    // Fallback for providers that return authorization code.
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const fail = new URL("/auth", requestUrl.origin);
        fail.searchParams.set("error", error.message);
        return NextResponse.redirect(fail);
      }

      return response;
    }

    const fail = new URL("/auth", requestUrl.origin);
    fail.searchParams.set("error", "Missing auth parameters in callback URL.");
    return NextResponse.redirect(fail);
  } catch (error) {
    const fail = new URL("/auth", requestUrl.origin);
    fail.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Authentication callback failed.",
    );
    return NextResponse.redirect(fail);
  }
}
