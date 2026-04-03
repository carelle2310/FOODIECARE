import * as tf from "@tensorflow/tfjs";
import * as fs from "fs";
import * as path from "path";

/**
 * Model loader utility - handles loading and caching of ML models.
 * Uses a Food-101 TensorFlow.js model (GraphModel or LayersModel).
 */

type LoadedFoodModel = tf.GraphModel | tf.LayersModel;

let cachedModel: LoadedFoodModel | null = null;
let modelLoaded = false;
let backendReady = false;

const modelPaths = {
  tfjs: path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "public",
    "models",
    "model.json",
  ),
};

const remoteModelUrl = process.env.FOOD101_MODEL_URL;

async function ensureTensorflowBackend(): Promise<void> {
  if (backendReady) return;

  const preferNative = process.env.USE_TFJS_NODE === "1";

  if (preferNative) {
    try {
      // @ts-expect-error Optional native backend; types missing when package isn't installed
      await import(/* turbopackIgnore: true */ "@tensorflow/tfjs-node");
      await tf.setBackend("tensorflow");
      backendReady = true;
      console.log("Using tfjs-node (TensorFlow) backend");
      return;
    } catch (err) {
      console.warn(
        "tfjs-node backend not available, falling back to default",
        err,
      );
    }
  }

  // Ensure a backend is ready (cpu/js). This path is slower but works everywhere.
  await tf.setBackend(tf.getBackend());
  backendReady = true;
}

function getModelSource(): { source: string; isRemote: boolean } {
  if (remoteModelUrl && remoteModelUrl.trim().length > 0) {
    return { source: remoteModelUrl.trim(), isRemote: true };
  }

  if (fs.existsSync(modelPaths.tfjs)) {
    return { source: `file://${modelPaths.tfjs}`, isRemote: false };
  }

  throw new Error(
    "Food-101 model not found. Place a TensorFlow.js model at public/models/model.json or set FOOD101_MODEL_URL.",
  );
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

async function loadLocalModel(modelJsonPath: string): Promise<LoadedFoodModel> {
  const modelDir = path.dirname(modelJsonPath);
  const rawModelJson = await fs.promises.readFile(modelJsonPath, "utf8");
  const modelJson = JSON.parse(rawModelJson) as {
    format?: string;
    modelTopology: tf.io.ModelJSON["modelTopology"];
    weightsManifest: Array<{
      paths: string[];
      weights: tf.io.WeightsManifestEntry[];
    }>;
  };

  const weightSpecs: tf.io.WeightsManifestEntry[] = [];
  const shardBuffers: Buffer[] = [];

  for (const group of modelJson.weightsManifest ?? []) {
    for (const spec of group.weights) {
      weightSpecs.push(spec);
    }

    for (const relPath of group.paths) {
      const shardPath = path.join(modelDir, relPath);
      shardBuffers.push(await fs.promises.readFile(shardPath));
    }
  }

  const weightData = Buffer.concat(shardBuffers);
  const ioHandler = tf.io.fromMemory(
    modelJson.modelTopology,
    weightSpecs,
    toArrayBuffer(weightData),
  );

  if (modelJson.format === "graph-model") {
    return tf.loadGraphModel(ioHandler);
  }

  return tf.loadLayersModel(ioHandler);
}

/**
 * Load custom TensorFlow.js model.
 * Tries GraphModel first, then LayersModel.
 */
export async function loadFoodModel(): Promise<LoadedFoodModel> {
  const { source, isRemote } = getModelSource();

  if (!isRemote) {
    const localModel = await loadLocalModel(modelPaths.tfjs);
    const modelType =
      typeof (localModel as tf.GraphModel).executeAsync === "function"
        ? "GraphModel"
        : "LayersModel";
    console.log(`Food-101 ${modelType} loaded successfully (local)`);
    return localModel;
  }

  try {
    const graphModel = await tf.loadGraphModel(source);
    console.log(
      `Food-101 GraphModel loaded successfully (${isRemote ? "remote" : "local"})`,
    );
    return graphModel;
  } catch {
    const layersModel = await tf.loadLayersModel(source);
    console.log(
      `Food-101 LayersModel loaded successfully (${isRemote ? "remote" : "local"})`,
    );
    return layersModel;
  }
}

function ensureBatchedInput(imageTensor: tf.Tensor): tf.Tensor4D {
  let tensor = imageTensor;

  if (tensor.shape.length === 3) {
    tensor = tf.expandDims(tensor, 0);
  }

  if (tensor.shape.length !== 4) {
    throw new Error(
      `Unexpected input tensor rank ${tensor.shape.length}. Expected rank 3 or 4.`,
    );
  }

  const tensor4d = tensor as tf.Tensor4D;
  const [batch, height, width, channels] = tensor4d.shape;

  if (batch !== 1) {
    throw new Error(`Expected batch size 1, received ${batch}`);
  }

  if (channels !== 3) {
    throw new Error(`Expected 3-channel RGB input, received ${channels}`);
  }

  if (height === 224 && width === 224) {
    return tensor4d;
  }

  return tf.image.resizeBilinear(tensor4d, [224, 224]);
}

function toVitInput(imageTensor: tf.Tensor4D): tf.Tensor4D {
  return tf.tidy(() => {
    const floatTensor =
      imageTensor.dtype === "float32"
        ? imageTensor
        : tf.cast(imageTensor, "float32");

    // ViT feature extractor config:
    // do_rescale: true (1/255), do_normalize: true, image_mean/std: 0.5
    // Equivalent transform: (x / 255 - 0.5) / 0.5 = x / 127.5 - 1
    const normalized = tf.sub(tf.div(floatTensor, 127.5), 1);

    // Converted graph model signature expects NCHW [batch, channels, height, width].
    const nchw = tf.transpose(normalized, [0, 3, 1, 2]);

    return nchw as tf.Tensor4D;
  });
}

function toProbabilities(raw: tf.Tensor2D): tf.Tensor2D {
  // Assume logits and softmax; avoids multiple dataSync calls.
  return tf.softmax(raw);
}

async function predictRaw(
  model: LoadedFoodModel,
  input: tf.Tensor4D,
): Promise<tf.Tensor2D> {
  if ((model as tf.LayersModel).predict) {
    const output = (model as tf.LayersModel).predict(input) as tf.Tensor;
    if (output.shape.length !== 2) {
      throw new Error(`Expected 2D model output, got shape ${output.shape}`);
    }
    return output as tf.Tensor2D;
  }

  const graphModel = model as tf.GraphModel;
  let output: tf.Tensor | tf.Tensor[];
  try {
    output = await graphModel.executeAsync({ pixel_values: input });
  } catch {
    output = await graphModel.executeAsync(input);
  }
  const outputTensor = Array.isArray(output) ? output[0] : output;

  if (!outputTensor || outputTensor.shape.length !== 2) {
    throw new Error(
      `Expected 2D graph output, got shape ${outputTensor?.shape ?? "undefined"}`,
    );
  }

  return outputTensor as tf.Tensor2D;
}

function extractTopK(
  probabilities: number[],
  k: number,
): Array<{ classId: number; score: number }> {
  return probabilities
    .map((score, classId) => ({ classId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Load model with caching - returns cached model if already loaded.
 */
export async function loadModel(): Promise<LoadedFoodModel> {
  try {
    if (cachedModel && modelLoaded) {
      console.log("Using cached Food-101 model");
      return cachedModel;
    }

    console.log("Loading Food-101 model");
    await ensureTensorflowBackend();
    cachedModel = await loadFoodModel();
    modelLoaded = true;

    // Warm up once to trigger graph compilation and reduce first-request latency.
    try {
      const warmup = tf.zeros([1, 3, 224, 224]);
      const output = await predictRaw(cachedModel, warmup as tf.Tensor4D);
      output.dispose();
      warmup.dispose();
      console.log("Model warm-up completed");
    } catch (warmErr) {
      console.warn("Model warm-up skipped", warmErr);
    }

    return cachedModel;
  } catch (error) {
    throw new Error(
      `Model loading failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Run inference on image tensor using Food-101 TensorFlow.js model.
 */
export async function runInference(
  model: LoadedFoodModel,
  imageTensor: tf.Tensor,
): Promise<{
  predictions: number[];
  topK: Array<{ classId: number; score: number }>;
}> {
  try {
    const batched = ensureBatchedInput(imageTensor);
    const vitInput = toVitInput(batched);

    const rawOutput = await predictRaw(model, vitInput);
    const probabilitiesTensor = toProbabilities(rawOutput);
    const predArray = Array.from(
      (await probabilitiesTensor.data()) as Float32Array,
    );

    const topK = extractTopK(predArray, 5);

    console.log("Food-101 predictions (topK):", topK);

    if (probabilitiesTensor !== rawOutput) {
      rawOutput.dispose();
    }
    probabilitiesTensor.dispose();

    if (batched !== imageTensor) {
      batched.dispose();
    }
    vitInput.dispose();

    return {
      predictions: predArray,
      topK,
    };
  } catch (error) {
    console.error("Inference error:", error);
    throw new Error(
      `Inference failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Get top-k predictions.
 */
function getTopKPredictions(
  predictions: number[],
  k: number,
): Array<{ classId: number; score: number }> {
  return predictions
    .map((score, classId) => ({ classId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Get prediction for a single class.
 */
export function getTopPrediction(predictions: number[]): {
  classId: number;
  confidence: number;
} {
  let maxConfidence = 0;
  let maxIndex = 0;

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] > maxConfidence) {
      maxConfidence = predictions[i];
      maxIndex = i;
    }
  }

  return {
    classId: maxIndex,
    confidence: Math.min(maxConfidence, 1.0),
  };
}

/**
 * Clear cached model.
 */
export function clearModelCache(): void {
  if (cachedModel) {
    cachedModel.dispose();
  }
  cachedModel = null;
  modelLoaded = false;
  tf.disposeVariables();
}
