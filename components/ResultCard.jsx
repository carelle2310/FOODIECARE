import Link from "next/link";
import NutritionGrid from "./NutritionGrid";
import RecommendationCard from "./RecommendationCard";

export default function ResultCard({ result }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg backdrop-blur-xl transition duration-300 hover:shadow-xl sm:p-8">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            AI Analysis Result
          </p>
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Food Detected: {result.food}
          </h1>
          {result.confidence != null ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                AI
              </span>
              <span className="text-sm text-slate-600">
                Confidence:{" "}
                <strong className="text-slate-800">{result.confidence}%</strong>
              </span>
            </div>
          ) : null}
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:scale-105 hover:shadow-md"
        >
          Analyze Another
        </Link>
      </div>

      <div className="mt-6 space-y-6">
        <NutritionGrid result={result} />
        <RecommendationCard text={result.recommendation} />
      </div>
    </article>
  );
}
