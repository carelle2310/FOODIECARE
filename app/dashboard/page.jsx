"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [goal, setGoal] = useState("");
  const [goalStatus, setGoalStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/meals");
      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals ?? []);
      }
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const data = await profileRes.json();
        setGoal(data.goal ?? "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const summary = useMemo(() => {
    if (!meals.length) {
      return {
        totalCalories: 0,
        avgCalories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        uniqueDays: 0,
      };
    }

    const totals = meals.reduce(
      (acc, meal) => {
        acc.totalCalories += meal.calories ?? 0;
        acc.protein += meal.protein ?? 0;
        acc.carbs += meal.carbs ?? 0;
        acc.fat += meal.fat ?? 0;
        acc.days.add(new Date(meal.created_at).toDateString());
        return acc;
      },
      { totalCalories: 0, protein: 0, carbs: 0, fat: 0, days: new Set() },
    );

    const avgCalories = totals.totalCalories / meals.length;

    return {
      totalCalories: Math.round(totals.totalCalories),
      avgCalories: Math.round(avgCalories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      uniqueDays: totals.days.size,
    };
  }, [meals]);

  const saveGoal = async () => {
    setGoalStatus("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (res.ok) setGoalStatus("Saved");
    else setGoalStatus("Failed to save");
  };

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-slate-800">
          Please sign in to see your history.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
            Dashboard
          </p>
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Welcome back
          </h1>
          <p className="text-sm text-slate-600">Signed in as {user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            ← Home
          </Link>
          <Link
            href="/#analyze"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600"
          >
            Analyze a meal
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            Switch account
          </Link>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total kcal",
            value: summary.totalCalories,
            accent: "from-emerald-500/15 to-emerald-600/10",
          },
          {
            label: "Avg kcal / meal",
            value: summary.avgCalories,
            accent: "from-blue-500/15 to-blue-600/10",
          },
          {
            label: "Protein (g)",
            value: summary.protein,
            accent: "from-amber-500/15 to-amber-600/10",
          },
          {
            label: "Active days",
            value: summary.uniqueDays,
            accent: "from-indigo-500/15 to-indigo-600/10",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-slate-100 bg-gradient-to-br ${card.accent} p-4 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Goal
              </p>
              <p className="text-sm text-slate-500">
                Align recommendations to your focus.
              </p>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-2 w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Choose a goal</option>
                <option value="Weight loss">Weight loss</option>
                <option value="Muscle gain">Muscle gain</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Cardio/Endurance">Cardio/Endurance</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <button
              type="button"
              onClick={saveGoal}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Save goal
            </button>
          </div>
          {goalStatus ? (
            <p className="mt-2 text-xs text-slate-500">{goalStatus}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Macros total
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Totals from logged meals
              </h2>
              <p className="text-xs text-slate-500">
                Cumulative since first log.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Protein", value: summary.protein, suffix: "g" },
              { label: "Carbs", value: summary.carbs, suffix: "g" },
              { label: "Fat", value: summary.fat, suffix: "g" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {item.value}
                  {item.suffix}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              History
            </p>
            <h2 className="text-xl font-bold text-slate-900">Recent meals</h2>
          </div>
          <span className="text-xs text-slate-500">
            Auto-logged from AI analysis
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        ) : meals.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            No meals yet. Analyze a meal to log it automatically.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {meal.food_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {meal.calories ?? "-"} kcal · P {meal.protein ?? "-"}g · C{" "}
                    {meal.carbs ?? "-"}g · F {meal.fat ?? "-"}g
                  </p>
                  {meal.goal ? (
                    <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Goal: {meal.goal}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(meal.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
