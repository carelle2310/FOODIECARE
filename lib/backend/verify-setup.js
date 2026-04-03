#!/usr/bin/env node

/**
 * FoodieCare AI System - Backend Development Checklist
 *
 * Run this script to verify all components are correctly installed and configured
 * Usage: node lib/backend/verify-setup.js
 */

const fs = require("fs");
const path = require("path");

const checks = [];

function check(name, fn) {
  return {
    name,
    fn,
  };
}

function passed(message) {
  console.log(`✅ ${message}`);
}

function failed(message) {
  console.log(`❌ ${message}`);
}

function warning(message) {
  console.log(`⚠️  ${message}`);
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

// Define all checks
const allChecks = [
  check("Backend utility files exist", () => {
    const files = [
      "lib/backend/types.ts",
      "lib/backend/imageProcessor.ts",
      "lib/backend/modelLoader.ts",
      "lib/backend/nutritionLoader.ts",
      "lib/backend/labelMapper.ts",
      "lib/backend/config.ts",
      "lib/backend/utils.ts",
      "lib/backend/index.ts",
    ];

    const missing = files.filter((f) => !fs.existsSync(f));
    if (missing.length === 0) {
      passed(`All ${files.length} backend utility files found`);
      return true;
    } else {
      failed(`Missing backend files: ${missing.join(", ")}`);
      return false;
    }
  }),

  check("API route exists", () => {
    if (fs.existsSync("app/api/predict/route.ts")) {
      passed("API prediction route found at app/api/predict/route.ts");
      return true;
    } else {
      failed("API route missing: app/api/predict/route.ts");
      return false;
    }
  }),

  check("Frontend components updated", () => {
    const components = [
      "components/UploadForm.jsx",
      "components/ResultCard.jsx",
      "components/NutritionGrid.jsx",
    ];

    const missing = components.filter((c) => !fs.existsSync(c));
    if (missing.length === 0) {
      passed(`All ${components.length} frontend components found`);
      return true;
    } else {
      failed(`Missing component files: ${missing.join(", ")}`);
      return false;
    }
  }),

  check("Nutrition data file exists", () => {
    if (fs.existsSync("nutrition.csv")) {
      const stats = fs.statSync("nutrition.csv");
      const sizeKB = (stats.size / 1024).toFixed(2);
      passed(`Nutrition CSV found (${sizeKB} KB)`);
      return true;
    } else {
      failed("Nutrition CSV missing. Expected: nutrition.csv in project root");
      return false;
    }
  }),

  check("Nutrition CSV is readable", () => {
    try {
      const content = fs.readFileSync("nutrition.csv", "utf-8");
      const lines = content.split("\n");
      const headerLine = lines[0];

      if (!headerLine) {
        failed("CSV appears to be empty");
        return false;
      }

      // Check for required columns
      const hasFood = headerLine.includes("Food");
      const hasCalories = headerLine.includes("Calories");
      const hasProtein = headerLine.includes("Protein");

      if (!hasFood || !hasCalories || !hasProtein) {
        warning(
          "CSV might be missing expected columns (Food, Calories, Protein)",
        );
        info(`CSV headers: ${headerLine}`);
      }

      const dataLines = lines.filter((l) => l.trim()).length - 1;
      passed(`CSV readable with ${dataLines} food entries`);
      return true;
    } catch (error) {
      failed(`Failed to read CSV: ${error.message}`);
      return false;
    }
  }),

  check("Dependencies installed", () => {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    const deps = packageJson.dependencies || {};

    const required = ["sharp", "csv-parse", "@tensorflow/tfjs"];
    const missing = required.filter((dep) => !deps[dep]);

    if (missing.length === 0) {
      passed(`All required dependencies are installed`);
      return true;
    } else {
      failed(`Missing dependencies: ${missing.join(", ")}`);
      info(`Install with: npm install ${missing.join(" ")}`);
      return false;
    }
  }),

  check("Documentation files exist", () => {
    const docs = [
      "AI_SYSTEM_GUIDE.md",
      "SETUP.md",
      "QUICK_REFERENCE.md",
      "API_INTEGRATION_GUIDE.md",
    ];

    const missing = docs.filter((d) => !fs.existsSync(d));
    if (missing.length === 0) {
      passed(`All ${docs.length} documentation files found`);
      return true;
    } else {
      warning(`Missing documentation: ${missing.join(", ")}`);
      return false;
    }
  }),

  check("Environment template exists", () => {
    if (fs.existsSync(".env.example")) {
      passed("Environment template exists at .env.example");
      return true;
    } else {
      warning("No .env.example template found");
      return false;
    }
  }),

  check("Models directory setup", () => {
    const hasPublicDir = fs.existsSync("public");
    if (!hasPublicDir) {
      warning("public/ directory does not exist - will use MobileNet from CDN");
      return false;
    }

    const modelsDir = "public/models";
    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir);
      const hasModelJson = files.includes("model.json");
      const hasWeights = files.includes("model.weights.bin");

      if (hasModelJson && hasWeights) {
        passed("Custom model files found - will use instead of MobileNet");
        return true;
      } else {
        info(
          "models/ directory exists but no custom model - will use MobileNet from CDN",
        );
        return false;
      }
    } else {
      info("No public/models/ directory - will use MobileNet from CDN");
      return false;
    }
  }),

  check("TypeScript configuration", () => {
    if (fs.existsSync("tsconfig.json")) {
      passed("TypeScript configuration found");
      return true;
    } else {
      warning("No tsconfig.json found");
      return false;
    }
  }),

  check("Node.js version", () => {
    const version = process.version;
    const major = parseInt(version.split(".")[0].replace("v", ""));

    if (major >= 18) {
      passed(`Node.js ${version} (compatible)`);
      return true;
    } else {
      failed(`Node.js ${version} - requires Node 18+`);
      return false;
    }
  }),
];

// Run all checks
console.log("\n🔍 FoodieCare AI System Verification\n");
console.log("=".repeat(50));

let passed_ = 0;
let failed_ = 0;
let warnings_ = 0;

allChecks.forEach(({ name, fn }) => {
  try {
    const result = fn();
    if (result === true) passed_++;
    if (result === false) failed_++;
  } catch (error) {
    failed(`${name}: ${error.message}`);
    failed_++;
  }
});

console.log("\n" + "=".repeat(50));
console.log(`\nResults: ✅ ${passed_} | ❌ ${failed_} | ⚠️  ${warnings_}\n`);

if (failed_ === 0) {
  console.log("🎉 All checks passed! System is ready.\n");
  console.log("Next steps:");
  console.log("1. Run: npm run dev");
  console.log("2. Open: http://localhost:3000");
  console.log("3. Upload a food image");
  console.log("4. See AI prediction + nutrition data\n");
  process.exit(0);
} else {
  console.log("⚠️  Some issues found. Please review above.\n");
  console.log("Common fixes:");
  console.log("- npm install (install dependencies)");
  console.log("- Download nutrition.csv from project instructions");
  console.log("- Check Node.js version: node --version\n");
  process.exit(1);
}
