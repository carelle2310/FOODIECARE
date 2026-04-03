/**
 * Backend API Integration Tests
 * Run with: npm test
 *
 * These are example tests showing how to test the AI system components
 */

// Example test cases for Jest or similar test framework
// Copy these tests and adapt to your test runner

describe("Image Processing", () => {
  // Test image preprocessing
  test("should resize image to 224x224", async () => {
    // Mock implementation
    const { preprocessImage } = await import("./imageProcessor");

    // Create a test image buffer
    const buffer = Buffer.from("fake image data");

    // This would need a real image in test
    // const result = await preprocessImage(buffer);
    // expect(result.width).toBe(224);
    // expect(result.height).toBe(224);
  });

  test("should validate image dimensions", async () => {
    const { validateImage } = await import("./imageProcessor");

    // Small image should fail
    // expect(validateImage(smallBuffer)).rejects.toThrow();

    // Valid image should pass
    // expect(validateImage(validBuffer)).resolves.toBe(true);
  });
});

describe("Model Loading", () => {
  test("should load model from cache", async () => {
    const { loadModel } = await import("./modelLoader");

    // First load
    const model1 = await loadModel();

    // Second load should return cached version
    const model2 = await loadModel();

    // expect(model1).toBe(model2); // Same reference
  });

  test("should fallback to MobileNet if custom model not found", async () => {
    // Mock file system to simulate missing model
    // const model = await loadModel();
    // expect(model).toBeDefined();
  });
});

describe("Nutrition Data Loading", () => {
  test("should load and cache nutrition data", async () => {
    const { loadNutritionData } = await import("./nutritionLoader");

    const data = await loadNutritionData();

    // expect(data).toBeDefined();
    // expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  test("should normalize food names correctly", async () => {
    const { normalizeFoodName } = await import("./nutritionLoader");

    expect(normalizeFoodName("Pizza Margherita")).toBe("pizza_margherita");
    expect(normalizeFoodName("  Apple Pie  ")).toBe("apple_pie");
    expect(normalizeFoodName("Fish & Chips")).toBe("fish_chips");
  });

  test("should find nutrition by food name", async () => {
    const { loadNutritionData, getNutritionByName } =
      await import("./nutritionLoader");

    const data = await loadNutritionData();
    const nutrition = getNutritionByName("pizza", data);

    // expect(nutrition).toBeDefined();
    // expect(nutrition?.calories).toBeGreaterThan(0);
  });

  test("should use fuzzy matching for similar foods", async () => {
    const { loadNutritionData, getNutritionWithFuzzy } =
      await import("./nutritionLoader");

    const data = await loadNutritionData();

    // Should find pizza even with typo
    const nutrition = getNutritionWithFuzzy("pizaa", data);
    // expect(nutrition).toBeDefined();
  });
});

describe("Label Mapping", () => {
  test("should map class ID to food label", async () => {
    const { getLabelForClassId } = await import("./labelMapper");

    const label = getLabelForClassId(0, "food101");
    expect(label).toBe("apple_pie");
  });

  test("should convert label to display name", async () => {
    const { toLabelDisplayName } = await import("./labelMapper");

    expect(toLabelDisplayName("apple_pie")).toBe("Apple Pie");
    expect(toLabelDisplayName("baby_back_ribs")).toBe("Baby Back Ribs");
  });

  test("should map prediction to labeled result", async () => {
    const { predictToLabel } = await import("./labelMapper");

    const result = predictToLabel({ classId: 1, confidence: 0.95 }, "food101");

    // expect(result.label).toBe('baby_back_ribs');
    // expect(result.displayName).toBe('Baby Back Ribs');
    // expect(result.confidence).toBe(0.95);
  });
});

describe("API Endpoint /api/predict", () => {
  test("should process image and return prediction", async () => {
    // Note: This requires running server
    // const response = await fetch('http://localhost:3000/api/predict', {
    //   method: 'POST',
    //   body: formData, // with image file
    // });
    // const data = await response.json();
    // expect(data.success).toBe(true);
    // expect(data.data.food).toBeDefined();
    // expect(data.data.confidence).toBeGreaterThan(0);
    // expect(data.data.nutrition).toBeDefined();
  });

  test("should return error for missing image", async () => {
    // const response = await fetch('http://localhost:3000/api/predict', {
    //   method: 'POST',
    //   body: new FormData(), // no image
    // });
    // expect(response.status).toBe(400);
    // const data = await response.json();
    // expect(data.success).toBe(false);
  });

  test("should return error for invalid image", async () => {
    // const response = await fetch('http://localhost:3000/api/predict', {
    //   method: 'POST',
    //   body: formDataWithInvalidImage,
    // });
    // expect(response.status).toBe(400);
  });

  test("should return top predictions", async () => {
    // const data = await predictWithImage(imageBuffer);
    // expect(data.topPredictions).toBeDefined();
    // expect(data.topPredictions.length).toBe(3);
    // expect(data.topPredictions[0].confidence >= data.topPredictions[1].confidence).toBe(true);
  });
});

describe("Error Handling", () => {
  test("should handle corrupted image gracefully", async () => {
    const { validateImage } = await import("./imageProcessor");

    // expect(validateImage(Buffer.from('invalid'))).rejects.toThrow();
  });

  test("should handle missing nutrition data gracefully", async () => {
    const { loadNutritionData, getNutritionWithFuzzy, getDefaultNutrition } =
      await import("./nutritionLoader");

    const data = await loadNutritionData();
    const result =
      getNutritionWithFuzzy("nonexistent_food_12345", data) ||
      getDefaultNutrition();

    // expect(result).toBeDefined();
    // expect(result.calories).toBe(0); // Default value
  });
});

describe("Performance", () => {
  test("should load model in reasonable time", async () => {
    const { PerformanceTimer } = await import("./utils");
    const { loadModel } = await import("./modelLoader");

    const timer = new PerformanceTimer("model-load");
    const model = await loadModel();
    const duration = timer.end();

    // First load might be slow, but should be under 30s
    // expect(duration).toBeLessThan(30000);
  });

  test("should cache model for fast subsequent loads", async () => {
    const { PerformanceTimer } = await import("./utils");
    const { loadModel } = await import("./modelLoader");

    // First load
    const timer1 = new PerformanceTimer("first-load");
    const model1 = await loadModel();
    const duration1 = timer1.end();

    // Second load (cached)
    const timer2 = new PerformanceTimer("second-load");
    const model2 = await loadModel();
    const duration2 = timer2.end();

    // Cached load should be much faster
    // expect(duration2).toBeLessThan(duration1 / 10);
  });
});

// Integration test example
describe("End-to-End Prediction", () => {
  test("complete prediction pipeline", async () => {
    /* This test would:
       1. Load an image file
       2. Preprocess it
       3. Load the model
       4. Run inference
       5. Load nutrition data
       6. Return formatted result
       
       In practice, you'd:
       - Use a test image in __tests__/fixtures/
       - Mock file system calls
       - Use proper async/await
       - Assert each step
    */
    // const image = fs.readFileSync('__tests__/fixtures/pizza.jpg');
    // const result = await predict(image);
    // expect(result.food).toBe('Pizza');
    // expect(result.confidence).toBeGreaterThan(0.5);
    // expect(result.nutrition.calories).toBeGreaterThan(100);
  });
});

// Manual testing utilities
export const testUtils = {
  /**
   * Test prediction with a file path
   */
  async testPredictionWithFile(filePath: string) {
    const fs = await import("fs").then((m) => m.promises);
    const fetch = require("node-fetch");

    const buffer = await fs.readFile(filePath);
    const formData = new FormData();
    const blob = new Blob([buffer], { type: "image/jpeg" });
    formData.append("image", blob);

    const response = await fetch("http://localhost:3000/api/predict", {
      method: "POST",
      body: formData,
    });

    return response.json();
  },

  /**
   * Test multiple images and compare results
   */
  async testMultipleImages(imagePaths: string[]) {
    const results = [];

    for (const path of imagePaths) {
      try {
        const result = await this.testPredictionWithFile(path);
        results.push({
          file: path,
          ...result,
        });
      } catch (error) {
        results.push({
          file: path,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },

  /**
   * Generate test report
   */
  generateReport(results: any[]) {
    const successful = results.filter((r) => !r.error);
    const failures = results.filter((r) => r.error);

    return {
      total: results.length,
      successful: successful.length,
      failed: failures.length,
      successRate: `${((successful.length / results.length) * 100).toFixed(1)}%`,
      results,
    };
  },
};

// To run manual tests:
// testUtils.testMultipleImages([
//   'test-images/pizza.jpg',
//   'test-images/burger.jpg',
//   'test-images/salad.jpg',
// ]).then(results => console.log(testUtils.generateReport(results)));
