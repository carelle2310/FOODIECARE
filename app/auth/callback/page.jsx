"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href,
      );
      if (error) {
        setMessage(`Sign-in failed: ${error.message}`);
        return;
      }
      setMessage("Signed in! Redirecting...");
      router.replace("/dashboard");
    };
    run();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-sm text-slate-700">{message}</p>
    </main>
  );
}
