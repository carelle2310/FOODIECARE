/**
 * Client-side AI food recognition using TensorFlow.js MobileNet.
 * *** Only import this file from 'use client' components (dynamic import preferred). ***
 */

/**
 * Maps MobileNet / ImageNet class labels to the food categories in our nutrition DB.
 * Each entry is [ourFoodKey, [...substrings that indicate a match in the raw label]].
 */
const FOOD_LABEL_MAP = [
  ["pizza", ["pizza"]],
  ["burger", ["cheeseburger", "hamburger", "hotdog", "hot dog"]],
  [
    "apple",
    [
      "apple",
      "granny smith",
      "banana",
      "orange",
      "lemon",
      "pear",
      "fig",
      "strawberry",
      "fruit",
    ],
  ],
  [
    "salad",
    [
      "salad",
      "broccoli",
      "cauliflower",
      "cabbage",
      "coleslaw",
      "guacamole",
      "green",
      "lettuce",
      "vegetable",
    ],
  ],
  ["rice", ["rice", "pilaf", "tapioca", "grain"]],
  [
    "pasta",
    [
      "pasta",
      "spaghetti",
      "carbonara",
      "noodle",
      "lasagna",
      "macaroni",
      "ravioli",
    ],
  ],
  [
    "sandwich",
    ["sandwich", "bagel", "pretzel", "hotdog", "bun", "loaf", "sub", "wrap"],
  ],
];

/**
 * Try to map an ImageNet label string to one of our food DB keys.
 * @param {string} label
 * @returns {string|null}
 */
export function mapLabelToFood(label) {
  const lower = label.toLowerCase();
  for (const [food, keywords] of FOOD_LABEL_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return food;
    }
  }
  return null;
}

/** Module-level singleton so the model loads once and is reused */
let cachedModelPromise = null;

async function loadMobileNet() {
  if (!cachedModelPromise) {
    cachedModelPromise = (async () => {
      // TF.js core must be imported before the model package
      await import("@tensorflow/tfjs");
      const mobilenet = await import("@tensorflow-models/mobilenet");
      return mobilenet.load({ version: 2, alpha: 1.0 });
    })();
  }
  return cachedModelPromise;
}

/**
 * Classify a food image element using MobileNet.
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageElement
 * @returns {Promise<{food: string|null, confidence: number, rawLabel: string}|null>}
 */
export async function classifyFood(imageElement) {
  const model = await loadMobileNet();
  const predictions = await model.classify(imageElement, 5);

  if (!predictions || predictions.length === 0) return null;

  // Walk through top-5 predictions and return the first one that maps to our DB
  for (const pred of predictions) {
    const food = mapLabelToFood(pred.className);
    if (food) {
      return {
        food,
        confidence: Math.round(pred.probability * 100),
        rawLabel: pred.className,
      };
    }
  }

  // No DB match — return the top prediction so we can still show it to the user
  return {
    food: null,
    confidence: Math.round(predictions[0].probability * 100),
    rawLabel: predictions[0].className,
  };
}
