import sharp from "sharp";

const TARGET_SIZE = 224;

interface ImageTensor {
  data: Float32Array;
  shape: [number, number, number];
  width: number;
  height: number;
}

async function readAndValidateMetadata(buffer: Buffer): Promise<void> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty buffer");
  }

  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid image dimensions");
  }

  if (metadata.width < 50 || metadata.height < 50) {
    throw new Error("Image too small (minimum 50x50 pixels)");
  }
}

/**
 * Fast preprocessing: single sharp pipeline to resize and extract raw RGB.
 */
export async function preprocessImage(buffer: Buffer): Promise<ImageTensor> {
  try {
    await readAndValidateMetadata(buffer);

    const raw = await sharp(buffer)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: "cover",
        position: "centre",
        fastShrinkOnLoad: true,
      })
      .removeAlpha()
      .raw()
      .toBuffer();

    const expectedChannels = TARGET_SIZE * TARGET_SIZE;
    const tensor = new Float32Array(TARGET_SIZE * TARGET_SIZE * 3);

    if (raw.length === expectedChannels * 3) {
      for (let i = 0; i < raw.length; i++) {
        tensor[i] = raw[i];
      }
    } else if (raw.length === expectedChannels) {
      // Expand grayscale images into RGB channels.
      for (let i = 0; i < expectedChannels; i++) {
        const value = raw[i];
        const base = i * 3;
        tensor[base] = value;
        tensor[base + 1] = value;
        tensor[base + 2] = value;
      }
    } else {
      throw new Error(`Unexpected image channel layout: ${raw.length} bytes`);
    }

    return {
      data: tensor,
      shape: [TARGET_SIZE, TARGET_SIZE, 3],
      width: TARGET_SIZE,
      height: TARGET_SIZE,
    };
  } catch (error) {
    throw new Error(
      `Image preprocessing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    await readAndValidateMetadata(buffer);

    return true;
  } catch (error) {
    throw new Error(
      `Image validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function getImageInfo(
  buffer: Buffer,
): Promise<{ width?: number; height?: number; format?: string }> {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch {
    return {};
  }
}
