// Type definitions for the food recognition system

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
}

export interface PredictionResult {
  food: string;
  confidence: number;
  nutrition: NutritionData;
  topPredictions?: Array<{
    label: string;
    confidence: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface NutritionRecord {
  [key: string]: NutritionData;
}

export interface RawNutritionCSV {
  [key: string]: string | number;
}
