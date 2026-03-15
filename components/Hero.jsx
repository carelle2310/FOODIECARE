import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl transition duration-300 hover:shadow-xl sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -left-20 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-12 h-44 w-44 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative max-w-2xl space-y-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          AI Nutrition Assistant
        </span>

        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            AI-Based Nutrition Analysis
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Upload your food image and instantly get calories, macronutrients,
            and healthy diet recommendations.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="#analyze"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition duration-200 hover:scale-105 hover:bg-emerald-600"
          >
            Analyze Your Food
          </Link>
          <Link
            href="#about"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:scale-105 hover:border-slate-300 hover:shadow-md"
          >
            Learn More
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xl font-bold text-slate-900">7+</p>
            <p className="text-xs text-slate-500">Supported food items</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xl font-bold text-slate-900">Fast</p>
            <p className="text-xs text-slate-500">Instant analysis result</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xl font-bold text-slate-900">Mobile</p>
            <p className="text-xs text-slate-500">Optimized for phones</p>
          </div>
        </div>
      </div>
    </section>
  );
}
