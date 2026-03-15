export default function RecommendationCard({ text }) {
  return (
    <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 shadow-sm sm:p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        Diet Suggestion
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
        {text}
      </p>
    </div>
  );
}
