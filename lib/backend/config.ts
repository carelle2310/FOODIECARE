// Configuration constants for the AI food recognition system

// Image processing settings
export const IMAGE_CONFIG = {
  TARGET_WIDTH: 224,
  TARGET_HEIGHT: 224,
  MIN_IMAGE_SIZE: 50, // pixels
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ACCEPTED_FORMATS: ["image/jpeg", "image/png", "image/webp"],

  // Normalization (ImageNet standard)
  MEAN: [0.485, 0.456, 0.406],
  STD: [0.229, 0.224, 0.225],
};

// Model settings
export const MODEL_CONFIG = {
  // Cache settings
  CACHE_ENABLED: true,
  CACHE_TTL: null, // null = no expiration (persists for app lifetime)

  // Model paths
  CUSTOM_MODEL_PATH: "public/models/model.json",
  CUSTOM_MODEL_WEIGHTS: "public/models/model.weights.bin",

  // Remote model (fallback)
  MOBILENET_URL:
    "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v3_large/model.json",

  // Inference settings
  BATCH_SIZE: 1,
  TOP_K: 3, // Return top 3 predictions
  CONFIDENCE_THRESHOLD: 0.1, // Filter predictions below this threshold
};

// Nutrition data settings
export const NUTRITION_CONFIG = {
  CSV_PATH: "nutrition.csv",
  CACHE_ENABLED: true,
  CACHE_TTL: null,

  // Column mappings (must match CSV headers)
  COLUMNS: {
    food: "Food",
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbohydrates",
    fat: "Fat",
    fiber: "Fiber",
    sugar: "Sugar",
    sodium: "Sodium",
    servingSize: "Serving Size",
  },
};

// API settings
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB

  // Response status codes
  STATUS: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
};

// Label dataset
export const DATASET_CONFIG = {
  DEFAULT: "food101",
  TYPES: {
    FOOD101: "food101",
    IMAGENET: "imagenet",
    CUSTOM: "custom",
  },
};

// Logging
export const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || "info", // 'debug' | 'info' | 'warn' | 'error'
  ENABLE_PERFORMANCE_LOGS: process.env.NODE_ENV === "development",
};

// Feature flags
export const FEATURES = {
  ENABLE_FUZZY_MATCHING: true,
  ENABLE_TOP_K_PREDICTIONS: true,
  ENABLE_ERROR_LOGGING: true,
  CACHE_NUTRITION_DATA: true,
  CACHE_MODEL: true,
};
