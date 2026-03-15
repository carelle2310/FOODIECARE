"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import ResultCard from "../../components/ResultCard";

function ResultContent() {
  const searchParams = useSearchParams();

  const parsedData = useMemo(() => {
    const raw = searchParams.get("data");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }, [searchParams]);

  if (!parsedData) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
        <h2 className="font-heading text-2xl font-semibold text-amber-800">
          No analysis result found
        </h2>
        <p className="mt-2 text-sm text-amber-800/90">
          Please analyze a food item from the homepage first.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-emerald-600"
        >
          Go back
        </Link>
      </div>
    );
  }

  return <ResultCard result={parsedData} />;
}

export default function ResultPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">
                Loading analysis result...
              </p>
            </div>
          }
        >
          <ResultContent />
        </Suspense>
      </section>

      <Footer />
    </main>
  );
}
