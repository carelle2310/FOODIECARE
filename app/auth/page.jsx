"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const redirectedError = searchParams.get("error");
    if (redirectedError) {
      setStatus(`Sign-in failed: ${redirectedError}`);
    }
  }, [searchParams]);

  useEffect(() => {
    let isActive = true;

    const checkSession = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (isActive && data.session) {
        router.replace("/dashboard");
      }
    };

    checkSession();

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setStatus("Magic link sent. Check your email.");
    } catch (err) {
      setStatus(err.message ?? "Unable to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-3xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter your email to receive a magic link.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {isLoading ? "Sending..." : "Send magic link"}
        </button>
        {status ? <p className="text-sm text-slate-600">{status}</p> : null}
      </form>
    </main>
  );
}
