import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("meal_logs")
      .select(
        "id, food_name, calories, protein, carbs, fat, goal, created_at, metadata",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ meals: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("/api/meals GET error", error);
    return NextResponse.json(
      { error: "Unable to load meals" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await request.json();
    const { foodName, nutrition, goal, metadata } = payload ?? {};

    if (!foodName) {
      return NextResponse.json(
        { error: "foodName is required" },
        { status: 400 },
      );
    }

    const service = createSupabaseServiceClient();

    const mealInsert: Database["public"]["Tables"]["meal_logs"]["Insert"] = {
      user_id: user.id,
      food_name: foodName,
      calories: nutrition?.calories ?? null,
      protein: nutrition?.protein ?? null,
      carbs: nutrition?.carbs ?? null,
      fat: nutrition?.fat ?? null,
      goal: goal ?? null,
      metadata: metadata ?? null,
    };

    // Supabase typing can be strict in edge runtimes; cast to any to satisfy overload
    const { error } = await service
      .from("meal_logs")
      .insert(mealInsert as any);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("/api/meals POST error", error);
    return NextResponse.json({ error: "Unable to save meal" }, { status: 500 });
  }
}
