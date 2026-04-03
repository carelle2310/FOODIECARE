// Minimal typed Supabase schema used in the app. Adjust to your actual database schema if it differs.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      meal_logs: {
        Row: {
          id: string;
          user_id: string;
          food_name: string;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          goal: string | null;
          created_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_name: string;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          goal?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_logs"]["Insert"]>;
      };
      user_profiles: {
        Row: {
          id: string;
          goal: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          goal?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_profiles"]["Insert"]
        >;
      };
    };
  };
}
