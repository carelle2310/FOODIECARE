import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client used for auth flows and user-facing data fetches.
 * Uses cookie-backed storage so PKCE code verifiers survive the email magic-link redirect.
 */
export function createSupabaseBrowserClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Supabase URL or anon key missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = {
    get(name: string) {
      if (typeof document === "undefined") return undefined;
      const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
      return match ? decodeURIComponent(match[2]) : undefined;
    },
    set(
      name: string,
      value: string,
      options: {
        expires?: number;
        maxAge?: number;
        path?: string;
        sameSite?: "lax" | "strict" | "none";
      },
    ) {
      if (typeof document === "undefined") return;
      const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Path=${options?.path ?? "/"}`,
        `SameSite=${options?.sameSite ?? "lax"}`,
      ];
      const maxAge = options?.maxAge ?? 60 * 60 * 24 * 7; // 7 days
      parts.push(`Max-Age=${maxAge}`);
      document.cookie = parts.join("; ");
    },
    remove(
      name: string,
      options: { path?: string; sameSite?: "lax" | "strict" | "none" },
    ) {
      if (typeof document === "undefined") return;
      document.cookie = `${name}=; Path=${options?.path ?? "/"}; Max-Age=0; SameSite=${options?.sameSite ?? "lax"}`;
    },
  };

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: cookieStore,
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  );
}
