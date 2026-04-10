import { NextRequest, NextResponse } from "next/server";
import * as tf from "@tensorflow/tfjs";
import { createHash } from "crypto";
import { preprocessImage } from "@/lib/backend/imageProcessor";
import { loadModel, runInference } from "@/lib/backend/modelLoader";
import {
  loadNutritionData,
  getNutritionWithFuzzy,
  getDefaultNutrition,
} from "@/lib/backend/nutritionLoader";
import {
  predictToLabel,
  predictionsTOLabels,
  normalizeLabelForNutrition,
} from "@/lib/backend/labelMapper";
import { getConfidenceThreshold } from "@/lib/backend/thresholdCalibration";
import { PredictionResult, ApiResponse } from "@/lib/backend/types";

export const runtime = "nodejs";

const FAST_DEMO_MODE = process.env.FAST_DEMO_MODE === "1";
const PREDICTION_CACHE_TTL_MS = 1000 * 60 * 15;
const PREDICTION_CACHE_MAX_ITEMS = 200;

interface PredictionCacheEntry {
  value: PredictionResult;
  expiresAt: number;
}

const globalPredictionState = globalThis as typeof globalThis & {
  __foodicarePredictionCache?: Map<string, PredictionCacheEntry>;
};

const predictionCache =
  globalPredictionState.__foodicarePredictionCache ??
  new Map<string, PredictionCacheEntry>();
globalPredictionState.__foodicarePredictionCache = predictionCache;
const DEMO_FOODS = [
  "pizza",
  "burger",
  "caesar_salad",
  "sushi",
  "chicken_curry",
  "pasta",
  "fried_rice",
  "grilled_salmon",
  "omelette",
  "steak",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickDemoFoods(seed: string): [string, string, string] {
  const index = hashString(seed) % DEMO_FOODS.length;
  const first = DEMO_FOODS[index];
  const second = DEMO_FOODS[(index + 3) % DEMO_FOODS.length];
  const third = DEMO_FOODS[(index + 6) % DEMO_FOODS.length];
  return [first, second, third];
}

function getCacheKeyFromBuffer(imageBuffer: Buffer): string {
  return createHash("sha1").update(imageBuffer).digest("hex");
}

function getCachedPrediction(cacheKey: string): PredictionResult | null {
  const entry = predictionCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    predictionCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCachedPrediction(cacheKey: string, result: PredictionResult): void {
  predictionCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + PREDICTION_CACHE_TTL_MS,
  });

  if (predictionCache.size > PREDICTION_CACHE_MAX_ITEMS) {
    const oldest = predictionCache.keys().next().value;
    if (oldest) predictionCache.delete(oldest);
  }
}

function toDisplayFoodLabel(label: string): string {
  if (!label || label === "unknown_food") {
    return "Unknown food";
  }

  return label
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function shouldRejectAsNonFood(
  mappedLabel: string,
  confidence: number,
  _rawClassName?: number | string,
): boolean {
  const minConfidence = getConfidenceThreshold();

  // Reject unknown labels and weak confidence only.
  // The mapped label already represents the food-domain projection.
  if (mappedLabel === "unknown_food") return true;
  if (mappedLabel.startsWith("class_")) return true;
  if (confidence < minConfidence) return true;

  return false;
}

function isNutritionBackedFoodLabel(
  label: string,
  nutritionData: Awaited<ReturnType<typeof loadNutritionData>>,
): boolean {
  if (!label || label === "unknown_food" || label.startsWith("class_")) {
    return false;
  }

  const normalized = normalizeLabelForNutrition(label);
  const nutrition =
    getNutritionWithFuzzy(normalized, nutritionData) || getDefaultNutrition();

  return nutrition.calories > 0;
}

/**
 * POST /api/predict
 * Handles image upload and returns food prediction with nutrition data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let imageTensor: tf.Tensor4D | null = null;
  const requestStart = process.hrtime.bigint();
  const timings: Record<string, number> = {};

  const mark = (name: string, start: bigint): void => {
    timings[name] = Number(process.hrtime.bigint() - start) / 1_000_000;
  };

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json(
        {
          success: false,
          error: "No image file provided",
          statusCode: 400,
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    if (!String(imageFile.type || "").startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Uploaded file must be an image",
          statusCode: 400,
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const bufferStart = process.hrtime.bigint();
    const buffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    mark("bufferMs", bufferStart);

    const cacheKey = getCacheKeyFromBuffer(imageBuffer);
    const cached = getCachedPrediction(cacheKey);
    if (cached) {
      mark("totalMs", requestStart);
      console.log("[predict] performance", {
        ...timings,
        cacheHit: true,
        backend: tf.getBackend(),
      });
      return NextResponse.json(
        {
          success: true,
          data: cached,
          statusCode: 200,
        } as ApiResponse<PredictionResult>,
        { status: 200 },
      );
    }

    if (FAST_DEMO_MODE) {
      const nutritionStart = process.hrtime.bigint();
      const nutritionData = await loadNutritionData();
      const [first, second, third] = pickDemoFoods(
        imageFile.name || `${imageFile.size}`,
      );

      const labels = [first, second, third].map((food) => ({
        label: food,
        nutrition:
          getNutritionWithFuzzy(
            normalizeLabelForNutrition(food),
            nutritionData,
          ) || getDefaultNutrition(),
      }));

      const result: PredictionResult = {
        food: toDisplayFoodLabel(labels[0].label),
        confidence: 0.95,
        nutrition: {
          calories: labels[0].nutrition.calories,
          protein: labels[0].nutrition.protein,
          carbs: labels[0].nutrition.carbs,
          fat: labels[0].nutrition.fat,
        },
        topPredictions: [
          { label: toDisplayFoodLabel(labels[0].label), confidence: 0.95 },
          { label: toDisplayFoodLabel(labels[1].label), confidence: 0.87 },
          { label: toDisplayFoodLabel(labels[2].label), confidence: 0.79 },
        ],
      };

      setCachedPrediction(cacheKey, result);
      mark("nutritionLookupMs", nutritionStart);
      mark("totalMs", requestStart);
      console.log("[predict] performance", {
        ...timings,
        cacheHit: false,
        mode: "demo",
        backend: tf.getBackend(),
      });

      return NextResponse.json(
        {
          success: true,
          data: result,
          statusCode: 200,
        } as ApiResponse<PredictionResult>,
        { status: 200 },
      );
    }

    // Start expensive independent I/O in parallel with image preprocessing.
    const modelPromise = loadModel();
    const nutritionDataPromise = loadNutritionData();

    // Preprocess image
    const preprocessStart = process.hrtime.bigint();
    const preprocessed = await preprocessImage(imageBuffer);
    mark("preprocessMs", preprocessStart);

    imageTensor = tf.tensor4d(preprocessed.data, [
      1,
      preprocessed.shape[0],
      preprocessed.shape[1],
      preprocessed.shape[2],
    ]);

    // Load model
    const modelLoadStart = process.hrtime.bigint();
    const model = await modelPromise;
    mark("modelLoadMs", modelLoadStart);

    // Run inference
    const inferenceStart = process.hrtime.bigint();
    const { topK } = await runInference(model, imageTensor);
    mark("inferenceMs", inferenceStart);

    // Get top prediction from Food-101 inference output
    const topPrediction = topK[0] || { classId: -1, score: 0 };
    const predictionLabel = predictToLabel(
      { classId: topPrediction.classId, confidence: topPrediction.score },
      "food101",
    );

    const topPredictions = predictionsTOLabels(topK, "food101");

    const indexedPredictions = topPredictions.map((mapped, idx) => ({
      mapped,
      raw: topK[idx],
    }));

    const bestKnownPrediction = indexedPredictions.find(
      ({ mapped, raw }) =>
        !shouldRejectAsNonFood(mapped.label, mapped.confidence, raw.classId),
    );
    const effectivePrediction = bestKnownPrediction?.mapped ?? predictionLabel;

    // Load nutrition data
    const nutritionData = await nutritionDataPromise;

    const rejectAsNonFood = shouldRejectAsNonFood(
      effectivePrediction.label,
      effectivePrediction.confidence,
      bestKnownPrediction?.raw.classId ?? topPrediction.classId,
    );

    const isNutritionBacked = isNutritionBackedFoodLabel(
      effectivePrediction.label,
      nutritionData,
    );

    const finalMappedLabel =
      rejectAsNonFood || !isNutritionBacked
        ? "unknown_food"
        : effectivePrediction.label;

    // Normalize label for nutrition lookup
    const nutritionLookupStart = process.hrtime.bigint();
    const nutritionKey = normalizeLabelForNutrition(finalMappedLabel);
    // Find nutrition data for predicted food
    const foodNutrition =
      getNutritionWithFuzzy(nutritionKey, nutritionData) ||
      getDefaultNutrition();
    mark("nutritionLookupMs", nutritionLookupStart);

    // Get top 3 predictions with labels
    const topPredictionsForResponse = topPredictions
      .filter((p) => isNutritionBackedFoodLabel(p.label, nutritionData))
      .slice(0, 3)
      .map((p) => ({
        label: toDisplayFoodLabel(p.label),
        confidence: p.confidence,
      }));

    if (topPredictionsForResponse.length === 0) {
      topPredictionsForResponse.push({
        label: "Unknown food",
        confidence: effectivePrediction.confidence,
      });
    }
    // Build response
    const result: PredictionResult = {
      food: toDisplayFoodLabel(finalMappedLabel),
      confidence: effectivePrediction.confidence, // Keep as decimal (0-1)
      nutrition: {
        calories: foodNutrition.calories,
        protein: foodNutrition.protein,
        carbs: foodNutrition.carbs,
        fat: foodNutrition.fat,
      },
      topPredictions: topPredictionsForResponse.map((p) => ({
        label: p.label,
        confidence: p.confidence, // Keep as decimal (0-1)
      })),
    };

    setCachedPrediction(cacheKey, result);
    mark("totalMs", requestStart);
    console.log("[predict] performance", {
      ...timings,
      cacheHit: false,
      mode: "inference",
      backend: tf.getBackend(),
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        statusCode: 200,
      } as ApiResponse<PredictionResult>,
      { status: 200 },
    );
  } catch (error) {
    console.error("Prediction error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Determine appropriate status code
    let status = 500;
    if (errorMessage.includes("Image")) {
      status = 400;
    } else if (errorMessage.includes("Model")) {
      status = 503;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        statusCode: status,
      } as ApiResponse<null>,
      { status },
    );
  } finally {
    imageTensor?.dispose();
  }
}

/**
 * OPTIONS /api/predict
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
