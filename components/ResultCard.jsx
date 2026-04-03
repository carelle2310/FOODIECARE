import Link from "next/link";
import NutritionGrid from "./NutritionGrid";
import RecommendationCard from "./RecommendationCard";

export default function ResultCard({ result }) {
  // Extract confidence - support both old and new backend formats
  const confidence = result.confidence
    ? Math.round(result.confidence * 100)
    : result.confidence;

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
          {confidence != null ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                AI
              </span>
              <span className="text-sm text-slate-600">
                Confidence:{" "}
                <strong className="text-slate-800">{confidence}%</strong>
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

      {/* Top predictions */}
      {result.topPredictions && result.topPredictions.length > 1 ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-3">
            AI also detected
          </p>
          <div className="flex flex-wrap gap-2">
            {result.topPredictions.slice(1, 3).map((pred, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700"
              >
                {pred.label}
                <span className="font-bold text-blue-500">
                  {pred.confidence}%
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        <NutritionGrid result={result} />
        {result.recommendation && (
          <RecommendationCard text={result.recommendation} />
        )}
        {result.tips && result.tips.length ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Personalized tips
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {result.tips.slice(0, 4).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
