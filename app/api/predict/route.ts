import { NextRequest, NextResponse } from "next/server";
import * as tf from "@tensorflow/tfjs";
import { preprocessImage, validateImage } from "@/lib/backend/imageProcessor";
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

/**
 * POST /api/predict
 * Handles image upload and returns food prediction with nutrition data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Convert file to buffer
    const buffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // Validate image
    await validateImage(imageBuffer);

    // Preprocess image
    console.log("Preprocessing image...");
    const preprocessed = await preprocessImage(imageBuffer);
    const imageTensor = tf.tensor4d(Array.from(preprocessed.data) as number[], [
      1,
      preprocessed.shape[0],
      preprocessed.shape[1],
      preprocessed.shape[2],
    ]);

    // Load model
    console.log("Loading model...");
    const model = await loadModel();

    // Run inference
    console.log("Running inference...");
    const { predictions, topK } = await runInference(model, imageTensor);

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

    console.log("Top prediction:", {
      classId: topPrediction.classId,
      confidence: topPrediction.score,
      label: predictionLabel.label,
      displayName: predictionLabel.displayName,
    });

    console.log("Raw confidence value:", topPrediction.score);
    console.log(
      "Confidence after rounding:",
      Math.round(topPrediction.score * 100),
    );

    // Load nutrition data
    console.log("Loading nutrition data...");
    const nutritionData = await loadNutritionData();

    const rejectAsNonFood = shouldRejectAsNonFood(
      effectivePrediction.label,
      effectivePrediction.confidence,
      bestKnownPrediction?.raw.classId ?? topPrediction.classId,
    );

    const finalMappedLabel = rejectAsNonFood
      ? "unknown_food"
      : effectivePrediction.label;

    // Normalize label for nutrition lookup
    const nutritionKey = normalizeLabelForNutrition(finalMappedLabel);
    console.log("Nutrition lookup key:", nutritionKey);

    // Find nutrition data for predicted food
    const foodNutrition =
      getNutritionWithFuzzy(nutritionKey, nutritionData) ||
      getDefaultNutrition();

    console.log("Nutrition found:", {
      key: nutritionKey,
      found: foodNutrition.calories > 0,
      calories: foodNutrition.calories,
      protein: foodNutrition.protein,
      carbs: foodNutrition.carbs,
      fat: foodNutrition.fat,
    });

    // Get top 3 predictions with labels
    const topPredictionsForResponse = topPredictions.map((p) => ({
      label: toDisplayFoodLabel(p.label),
      confidence: p.confidence,
    }));
    console.log(
      "Top 3 predictions:",
      topPredictionsForResponse.map((p) => ({
        label: p.label,
        confidence: p.confidence,
      })),
    );

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

    // Cleanup tensors
    imageTensor.dispose();

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
