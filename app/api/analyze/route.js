import { readFile } from "fs/promises";
import path from "path";

function formatFoodName(name) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildRecommendation(nutrition) {
  const notes = [];

  if (nutrition.calories > 300) {
    notes.push("Calories are high, so consider reducing portion size.");
  }
  if (nutrition.carbs > 40) {
    notes.push(
      "Carbohydrates are on the higher side, balance this meal with more protein.",
    );
  }
  if (nutrition.fat > 15) {
    notes.push(
      "Fat is relatively high, choose grilled options over fried when possible.",
    );
  }

  if (notes.length === 0) {
    notes.push(
      "This looks fairly balanced. Pair it with water and fresh vegetables for better nutrition.",
    );
  }

  return notes.join(" ");
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const inputFoodName = formData.get("foodName");

    const foodName = String(inputFoodName || "")
      .trim()
      .toLowerCase();

    // Optional AI confidence score forwarded from MobileNet client-side inference
    const confidenceRaw = formData.get("confidence");
    const confidence =
      confidenceRaw !== null ? Math.round(Number(confidenceRaw)) : null;

    if (!foodName) {
      return Response.json(
        { error: "Food name is required." },
        { status: 400 },
      );
    }

    const filePath = path.join(process.cwd(), "data", "nutrition.json");
    const fileContent = await readFile(filePath, "utf-8");
    const nutritionDB = JSON.parse(fileContent);

    const nutrition = nutritionDB[foodName];

    if (!nutrition) {
      return Response.json(
        {
          error: "Food not found in database.",
          supportedFoods: Object.keys(nutritionDB),
        },
        { status: 404 },
      );
    }

    return Response.json({
      food: formatFoodName(foodName),
      confidence: confidence,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      recommendation: buildRecommendation(nutrition),
    });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to analyze the food right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
