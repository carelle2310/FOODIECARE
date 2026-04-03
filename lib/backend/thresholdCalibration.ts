import * as fs from "fs";
import * as path from "path";

interface CalibrationFile {
  threshold?: number;
  evaluatedSamples?: number;
  generatedAt?: string;
  metric?: string;
}

const DEFAULT_THRESHOLD = 0.12;
const calibrationPath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "models",
  "calibration.json",
);

let cachedThreshold: number | null = null;

export function getConfidenceThreshold(): number {
  const envThreshold = process.env.FOOD_CONFIDENCE_THRESHOLD;
  if (envThreshold) {
    const parsed = Number(envThreshold);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 1) {
      return parsed;
    }
  }

  if (cachedThreshold !== null) {
    return cachedThreshold;
  }

  try {
    if (!fs.existsSync(calibrationPath)) {
      cachedThreshold = DEFAULT_THRESHOLD;
      return cachedThreshold;
    }

    const raw = fs.readFileSync(calibrationPath, "utf8");
    const parsed = JSON.parse(raw) as CalibrationFile;

    const threshold = Number(parsed.threshold);
    if (!Number.isNaN(threshold) && threshold > 0 && threshold < 1) {
      cachedThreshold = threshold;
      return cachedThreshold;
    }
  } catch (error) {
    console.warn(
      "Failed to read calibration.json, using default threshold",
      error,
    );
  }

  cachedThreshold = DEFAULT_THRESHOLD;
  return cachedThreshold;
}

export function clearThresholdCache(): void {
  cachedThreshold = null;
}
