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

    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const service = createSupabaseServiceClient();
    const { data, error } = await service
      .from("user_profiles")
      .select("goal")
      .eq("id", user.id)
      .maybeSingle<Database["public"]["Tables"]["user_profiles"]["Row"]>();

    if (error && error.code !== "PGRST116") throw error; // 116 = row not found

    return NextResponse.json({ goal: data ? data.goal ?? null : null });
  } catch (error) {
    console.error("/api/profile GET error", error);
    return NextResponse.json(
      { error: "Unable to load profile" },
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

    if (!user)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { goal } = await request.json();

    const service = createSupabaseServiceClient();
    const profileUpsert: Database["public"]["Tables"]["user_profiles"]["Insert"] = {
      id: user.id,
      goal: goal ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await service
      .from("user_profiles")
      // Supabase typings can be strict in edge runtimes; cast for safety
      .upsert(profileUpsert as any);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/profile POST error", error);
    return NextResponse.json(
      { error: "Unable to update profile" },
      { status: 500 },
    );
  }
}
