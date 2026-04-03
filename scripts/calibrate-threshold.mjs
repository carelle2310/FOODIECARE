import fs from "fs";
import path from "path";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";

const rootDir = process.cwd();
const classesPath = path.join(
  rootDir,
  "data",
  "food-101",
  "meta",
  "meta",
  "classes.txt",
);
const testSplitPath = path.join(
  rootDir,
  "data",
  "food-101",
  "meta",
  "meta",
  "test.txt",
);
const imagesRoot = path.join(rootDir, "data", "food-101", "images");
const localModelPath = path.join(rootDir, "public", "models", "model.json");
const calibrationOutputPath = path.join(
  rootDir,
  "public",
  "models",
  "calibration.json",
);

const sampleLimit = Number(process.env.CALIBRATION_SAMPLES || "1200");
const targetSize = 224;

function readLines(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getModelSource() {
  if (process.env.FOOD101_MODEL_URL) {
    return process.env.FOOD101_MODEL_URL;
  }
  if (fs.existsSync(localModelPath)) {
    return localModelPath;
  }

  throw new Error(
    "No model source found. Set FOOD101_MODEL_URL or place model at public/models/model.json",
  );
}

async function loadModel(modelSource) {
  if (!/^https?:\/\//i.test(modelSource)) {
    const modelDir = path.dirname(modelSource);
    const modelJson = JSON.parse(fs.readFileSync(modelSource, "utf8"));

    const weightSpecs = [];
    const shardBuffers = [];

    for (const group of modelJson.weightsManifest ?? []) {
      for (const spec of group.weights) {
        weightSpecs.push(spec);
      }
      for (const relPath of group.paths) {
        shardBuffers.push(fs.readFileSync(path.join(modelDir, relPath)));
      }
    }

    const weightData = Buffer.concat(shardBuffers);
    const ioHandler = tf.io.fromMemory(
      modelJson.modelTopology,
      weightSpecs,
      weightData.buffer.slice(
        weightData.byteOffset,
        weightData.byteOffset + weightData.byteLength,
      ),
    );

    if (modelJson.format === "graph-model") {
      return tf.loadGraphModel(ioHandler);
    }

    return tf.loadLayersModel(ioHandler);
  }

  try {
    return await tf.loadGraphModel(modelSource);
  } catch {
    return await tf.loadLayersModel(modelSource);
  }
}

async function preprocessToTensor(imagePath) {
  const raw = await sharp(imagePath)
    .resize(targetSize, targetSize, { fit: "cover", position: "center" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const data = new Float32Array(targetSize * targetSize * 3);
  for (let i = 0; i < raw.length; i += 3) {
    const j = i;
    // ViT preprocessor: (x / 255 - 0.5) / 0.5 = x / 127.5 - 1
    data[j] = raw[i] / 127.5 - 1;
    data[j + 1] = raw[i + 1] / 127.5 - 1;
    data[j + 2] = raw[i + 2] / 127.5 - 1;
  }

  const nhwc = tf.tensor4d(data, [1, targetSize, targetSize, 3], "float32");
  const nchw = tf.transpose(nhwc, [0, 3, 1, 2]);
  nhwc.dispose();
  return nchw;
}

async function predictProbabilities(model, input) {
  let output;

  if (typeof model.predict === "function") {
    output = model.predict(input);
  } else {
    try {
      output = await model.executeAsync({ pixel_values: input });
    } catch {
      output = await model.executeAsync(input);
    }
    output = Array.isArray(output) ? output[0] : output;
  }

  if (!output || output.shape.length !== 2) {
    throw new Error(`Expected [1, classes] output, got ${output?.shape}`);
  }

  const min = output.min().dataSync()[0];
  const max = output.max().dataSync()[0];
  const sum = output.sum(1).dataSync()[0];

  const probs =
    min >= 0 && max <= 1 && Math.abs(sum - 1) < 0.02
      ? output
      : tf.softmax(output);
  const arr = Array.from(await probs.data());

  if (probs !== output) {
    probs.dispose();
  }
  output.dispose();

  return arr;
}

function argmax(values) {
  let idx = 0;
  let best = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > best) {
      best = values[i];
      idx = i;
    }
  }
  return { idx, score: best };
}

function chooseThreshold(records) {
  let bestThreshold = 0.1;
  let bestScore = -Infinity;
  let bestMetrics = null;

  for (let t = 0.05; t <= 0.9; t += 0.01) {
    let accepted = 0;
    let acceptedCorrect = 0;
    let coveredCorrect = 0;

    for (const record of records) {
      if (record.confidence >= t) {
        accepted += 1;
        if (record.correct) {
          acceptedCorrect += 1;
          coveredCorrect += 1;
        }
      }
    }

    const coverage = accepted / records.length;
    const precision = accepted === 0 ? 0 : acceptedCorrect / accepted;
    const totalAccuracy = coveredCorrect / records.length;

    // Prefer thresholds that maximize total retained accuracy while avoiding very low precision.
    const score =
      totalAccuracy + 0.15 * precision + (coverage >= 0.35 ? 0.05 : -0.2);

    if (score > bestScore) {
      bestScore = score;
      bestThreshold = Number(t.toFixed(2));
      bestMetrics = {
        coverage,
        precision,
        totalAccuracy,
      };
    }
  }

  return { threshold: bestThreshold, metrics: bestMetrics };
}

async function main() {
  const classes = readLines(classesPath);
  const classToIndex = new Map(classes.map((label, idx) => [label, idx]));
  const split = readLines(testSplitPath).slice(0, sampleLimit);

  const modelSource = getModelSource();
  const model = await loadModel(modelSource);

  const records = [];

  for (let i = 0; i < split.length; i++) {
    const rel = split[i];
    const trueLabel = rel.split("/")[0];
    const expectedIndex = classToIndex.get(trueLabel);

    if (expectedIndex === undefined) {
      continue;
    }

    const imagePath = path.join(imagesRoot, `${rel}.jpg`);
    if (!fs.existsSync(imagePath)) {
      continue;
    }

    const input = await preprocessToTensor(imagePath);
    const probabilities = await predictProbabilities(model, input);
    input.dispose();

    const { idx, score } = argmax(probabilities);
    records.push({
      correct: idx === expectedIndex,
      confidence: score,
    });

    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/${split.length}`);
    }
  }

  if (records.length === 0) {
    throw new Error(
      "No validation records were processed. Check dataset paths.",
    );
  }

  const { threshold, metrics } = chooseThreshold(records);

  const output = {
    threshold,
    evaluatedSamples: records.length,
    generatedAt: new Date().toISOString(),
    metric: "max_retained_accuracy_with_precision_guard",
    metrics,
  };

  fs.mkdirSync(path.dirname(calibrationOutputPath), { recursive: true });
  fs.writeFileSync(calibrationOutputPath, JSON.stringify(output, null, 2));

  console.log("Calibration written:", calibrationOutputPath);
  console.log(output);

  if (typeof model.dispose === "function") {
    model.dispose();
  }
}

main().catch((error) => {
  console.error("Calibration failed:", error);
  process.exit(1);
});
