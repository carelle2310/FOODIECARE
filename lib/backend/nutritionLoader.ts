import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { NutritionData, NutritionRecord, RawNutritionCSV } from "./types";

/**
 * Nutrition data loader utility - loads and caches nutrition information from CSV
 */

let cachedNutritionData: NutritionRecord | null = null;

const NUTRITION_CSV_PATH = path.join(process.cwd(), "nutrition.csv");

function getField(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    if (row[alias] != null && row[alias] !== "") {
      return row[alias];
    }
  }
  return "";
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse CSV and load nutrition data
 */
export async function loadNutritionData(): Promise<NutritionRecord> {
  try {
    // Return cached data if available
    if (cachedNutritionData) {
      console.log("Using cached nutrition data");
      return cachedNutritionData;
    }

    if (!fs.existsSync(NUTRITION_CSV_PATH)) {
      throw new Error(`Nutrition CSV not found at ${NUTRITION_CSV_PATH}`);
    }

    const csvContent = fs.readFileSync(NUTRITION_CSV_PATH, "utf-8");
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const bestRowByLabel = new Map<
      string,
      { row: Record<string, string>; score: number }
    >();

    for (const row of rows) {
      const labelRaw = getField(row, ["label", "Label", "food", "Food"]);
      const normalizedLabel = normalizeFoodName(labelRaw);

      if (!normalizedLabel) {
        continue;
      }

      const weight = toNumber(getField(row, ["weight", "Weight", "serving_size", "Serving Size"]));
      // Prefer entries closest to 100g for consistency.
      const score = weight > 0 ? Math.abs(weight - 100) : Number.POSITIVE_INFINITY;

      const existing = bestRowByLabel.get(normalizedLabel);
      if (!existing || score < existing.score) {
        bestRowByLabel.set(normalizedLabel, { row, score });
      }
    }

    const nutritionData: NutritionRecord = {};
    for (const [label, { row }] of bestRowByLabel.entries()) {
      const weight = getField(row, ["weight", "Weight", "serving_size", "Serving Size"]);

      nutritionData[label] = {
        calories: toNumber(getField(row, ["calories", "Calories"])),
        protein: toNumber(getField(row, ["protein", "Protein"])),
        carbs: toNumber(getField(row, ["carbohydrates", "carbs", "Carbohydrates", "Carbs"])),
        fat: toNumber(getField(row, ["fats", "fat", "Fats", "Fat"])),
        fiber: toNumber(getField(row, ["fiber", "Fiber"])),
        sugar: toNumber(getField(row, ["sugars", "sugar", "Sugars", "Sugar"])),
        sodium: toNumber(getField(row, ["sodium", "Sodium"])),
        servingSize: weight ? `${weight} g` : undefined,
      };
    }

    cachedNutritionData = nutritionData;
    console.log(
      `Loaded nutrition data for ${Object.keys(nutritionData).length} foods`,
    );

    return nutritionData;
  } catch (error) {
    throw new Error(
      `Failed to load nutrition data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Normalize food name for matching
 * @param foodName - Raw food name from dataset
 * @returns Normalized food name
 */
export function normalizeFoodName(foodName: string): string {
  return foodName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Find nutrition data by food name
 * @param foodName - Normalized food name
 * @param nutritionData - Nutrition data map
 * @returns Nutrition data or null if not found
 */
export function getNutritionByName(
  foodName: string,
  nutritionData: NutritionRecord,
): NutritionData | null {
  const normalized = normalizeFoodName(foodName);
  return nutritionData[normalized] || null;
}

/**
 * Get nutrition data with fuzzy matching
 * Useful for finding close matches if exact match doesn't exist
 */
export function getNutritionWithFuzzy(
  foodName: string,
  nutritionData: NutritionRecord,
): NutritionData | null {
  const normalized = normalizeFoodName(foodName);

  // Try exact match first
  if (nutritionData[normalized]) {
    return nutritionData[normalized];
  }

  // Try partial match
  const keys = Object.keys(nutritionData);
  const partial = keys.find(
    (key) =>
      key.includes(normalized) ||
      normalized.includes(key) ||
      calculateSimilarity(key, normalized) > 0.6,
  );

  return partial ? nutritionData[partial] : null;
}

/**
 * Simple string similarity calculation (Levenshtein-like)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance
 */
function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}

/**
 * Get default nutrition if data not found
 */
export function getDefaultNutrition(): NutritionData {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    servingSize: "Unknown",
  };
}

/**
 * Clear nutrition data cache
 */
export function clearNutritionCache(): void {
  cachedNutritionData = null;
}
