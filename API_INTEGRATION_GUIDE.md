/\*\*

- API Route Integration Guide
-
- This guide shows how to integrate the new prediction system
- with the existing /api/analyze route
  \*/

// Before: Old /api/analyze route (existing)
// After: Updated /api/analyze route that works with /api/predict

// EXAMPLE: Updated /api/analyze route to use new prediction system
// Location: app/api/analyze/route.ts

/\*
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/backend/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
try {
const formData = await request.formData();
const foodName = formData.get('foodName') as string;
const confidence = formData.get('confidence');
const nutritionJSON = formData.get('nutrition') as string;

    if (!foodName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Food name is required',
          statusCode: 400,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Parse nutrition data from prediction API
    let nutrition = null;
    if (nutritionJSON) {
      try {
        nutrition = JSON.parse(nutritionJSON);
      } catch {
        // If parsing fails, will generate default
        nutrition = null;
      }
    }

    // Additional analysis or database storage can go here
    const result = {
      food: foodName,
      confidence: confidence ? parseFloat(confidence as string) : null,
      nutrition,
      timestamp: new Date().toISOString(),
      // Add other fields as needed
    };

    return NextResponse.json(
      {
        success: true,
        data: result,
        statusCode: 200,
      },
      { status: 200 }
    );

} catch (error) {
return NextResponse.json(
{
success: false,
error: error instanceof Error ? error.message : 'Analysis failed',
statusCode: 500,
},
{ status: 500 }
);
}
}
\*/

// Flow Diagram:
//
// 1. User uploads image
// ↓
// Frontend (UploadForm.jsx)
// ↓
// POST /api/predict ← Image file
// ↓
// Backend processes image, runs model, gets nutrition
// ↓
// Response with food name + nutrition
// ↓
// Frontend displays prediction + nutrition preview
// User clicks "Analyze Nutrition"
// ↓
// POST /api/analyze ← Food name + nutrition data
// ↓
// /api/analyze can store in database, generate recommendations, etc.
// ↓
// Redirect to /result page

// Migration Steps:

/\*\*

- STEP 1: Update frontend form data passing
-
- OLD: UploadForm sent only foodName
- NEW: UploadForm sends foodName + nutrition from prediction response
  \*/

/\*
// OLD UploadForm.jsx:
const formData = new FormData();
formData.append('foodName', foodName.trim());
formData.append('confidence', String(confidence || 0));

// NEW UploadForm.jsx:
const formData = new FormData();
formData.append('foodName', foodName.trim());
if (predictionResult) {
formData.append('confidence', String(predictionResult.confidence));
formData.append('nutrition', JSON.stringify(predictionResult.nutrition));
}
\*/

/\*\*

- STEP 2: Update /api/analyze to accept nutrition data
-
- The API now receives pre-computed nutrition from the prediction API,
- so it can skip redundant lookups
  \*/

/\*
// app/api/analyze/route.ts
export async function POST(request: NextRequest) {
const foodName = formData.get('foodName');
const confidence = formData.get('confidence');
const nutritionData = formData.get('nutrition'); // NEW

// Store in database, generate recommendations, etc.
// Nutrition data is already computed, no need to re-query
}
\*/

/\*\*

- STEP 3: Update ResultCard to use new nutrition format
-
- OLD: result.calories, result.protein, etc.
- NEW: result.nutrition.calories, result.nutrition.protein, etc.
  \*/

/\*
// OLD:
<NutritionGrid result={result} />

// NEW (handles both):
// NutritionGrid now checks for result.nutrition first
<NutritionGrid result={result} />
\*/

/\*\*

- Optional: Store predictions in database
  \*/

/\*
// In /api/analyze or separate route:
import { db } from '@/lib/db'; // Your database client

export async function POST(request: NextRequest) {
const { food, confidence, nutrition } = parseRequest(request);

await db.predictions.create({
food,
confidence,
calories: nutrition.calories,
protein: nutrition.protein,
carbs: nutrition.carbs,
fat: nutrition.fat,
timestamp: new Date(),
userId: getUserId(request), // If you have authentication
});
}
\*/

/\*\*

- Optional: Generate recommendations based on nutrition
  \*/

/\*
export function generateRecommendations(nutrition: NutritionData): string {
const recommendations = [];

if (nutrition.calories > 500) {
recommendations.push('This is a calorie-dense meal');
}

if (nutrition.protein < 10) {
recommendations.push('Low in protein - consider adding chicken');
}

if (nutrition.fat > 20) {
recommendations.push('High in fat - balance with vegetables');
}

if (nutrition.sodium > 800) {
recommendations.push('Contains significant sodium');
}

return recommendations.join('. ');
}
\*/

export {};
