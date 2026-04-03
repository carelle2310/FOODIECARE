import { NextRequest, NextResponse } from "next/server";
import {
  loadNutritionData,
  getNutritionWithFuzzy,
  getDefaultNutrition,
} from "@/lib/backend/nutritionLoader";
import { normalizeLabelForNutrition } from "@/lib/backend/labelMapper";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type Goal =
  | "Weight loss"
  | "Muscle gain"
  | "Maintenance"
  | "Cardio/Endurance"
  | "Custom"
  | string
  | null;

function formatFoodName(name: string): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildRecommendations(
  nutrition: NutritionData,
  goal: Goal,
): {
  primary: string;
  tips: string[];
} {
  const tips: string[] = [];

  // Universal hygiene tips first
  if (nutrition.calories > 600) {
    tips.push(
      "Portion is high in calories; consider a smaller serving or add veggies.",
    );
  }
  if (nutrition.fat > 20) {
    tips.push("Fat is on the higher side; prefer grilled/roasted over fried.");
  }
  if (nutrition.carbs > 60) {
    tips.push(
      "Carbs are high; pair with lean protein or add fiber to slow absorption.",
    );
  }
  if (nutrition.protein < 15) {
    tips.push("Protein is low; add lean protein (chicken, fish, tofu, beans).");
  }

  const g = goal?.toLowerCase() || "";

  if (g.includes("weight")) {
    tips.unshift(
      "Weight loss focus: aim for a calorie deficit with high protein and fiber.",
    );
    if (nutrition.calories > 500)
      tips.push("Split into two smaller meals to reduce calories per sitting.");
    if (nutrition.carbs > 50)
      tips.push(
        "Swap refined carbs for veggies/whole grains to lower kcal density.",
      );
  } else if (g.includes("muscle")) {
    tips.unshift(
      "Muscle gain focus: prioritize protein and adequate calories.",
    );
    if (nutrition.protein < 25)
      tips.push(
        "Boost protein to at least ~25-35g by adding lean meat, tofu, or whey.",
      );
    if (nutrition.calories < 400)
      tips.push(
        "Consider adding complex carbs (rice, potatoes, oats) to support training.",
      );
  } else if (g.includes("cardio") || g.includes("endurance")) {
    tips.unshift("Endurance focus: favor complex carbs with moderate protein.");
    if (nutrition.fat > 20)
      tips.push("Reduce fat pre-workout to avoid GI discomfort.");
    if (nutrition.carbs < 40)
      tips.push("Add carbs (banana, rice, pasta) to fuel longer sessions.");
  } else if (g.includes("maintain")) {
    tips.unshift(
      "Maintenance focus: keep balanced macros and steady portions.",
    );
  } else if (g.includes("custom")) {
    tips.unshift(
      "Custom goal: adjust portions to your target while keeping protein solid.",
    );
  }

  if (tips.length === 0) {
    tips.push(
      "This looks balanced. Pair with water and vegetables for extra fiber.",
    );
  }

  return { primary: tips[0], tips };
}

async function fetchUserGoal(cookieHeader: string | null): Promise<Goal> {
  try {
    // If no Supabase auth cookies are present, skip goal lookup to save a network round-trip.
    if (!cookieHeader || !cookieHeader.includes("sb-")) return null;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("user_profiles")
      .select("goal")
      .eq("id", user.id)
      .maybeSingle<{ goal: string | null }>();

    return data?.goal ?? null;
  } catch (err) {
    console.warn("[analyze] Goal lookup skipped", err);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const inputFoodName = formData.get("foodName");

    const foodName = String(inputFoodName || "")
      .trim()
      .toLowerCase();

    const confidenceRaw = formData.get("confidence");
    const confidenceParsed =
      confidenceRaw !== null ? Number(confidenceRaw) : null;
    const confidence =
      confidenceParsed !== null && Number.isFinite(confidenceParsed)
        ? Math.max(0, Math.min(confidenceParsed, 1))
        : null;

    if (!foodName) {
      return NextResponse.json(
        { error: "Food name is required." },
        { status: 400 },
      );
    }

    // Load nutrition data from CSV
    const nutritionData = await loadNutritionData();

    // Normalize food name for lookup
    const normalizedFoodName = normalizeLabelForNutrition(foodName);
    console.log("Analyze lookup:", {
      original: foodName,
      normalized: normalizedFoodName,
    });

    // Find nutrition data
    const nutrition =
      getNutritionWithFuzzy(normalizedFoodName, nutritionData) ||
      getDefaultNutrition();

    console.log("Nutrition result:", {
      found: nutrition.calories > 0,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    });

    if (nutrition.calories === 0) {
      return NextResponse.json(
        {
          error: "Food not found in database.",
          supportedFoods: Object.keys(nutritionData).slice(0, 10), // Show first 10 foods
        },
        { status: 404 },
      );
    }

    const goal = await fetchUserGoal(request.headers.get("cookie"));
    const rec = buildRecommendations(nutrition, goal);

    return NextResponse.json({
      food: formatFoodName(foodName),
      confidence: confidence,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      goal: goal ?? null,
      recommendation: rec.primary,
      tips: rec.tips,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      {
        error: "Unable to analyze the food right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
