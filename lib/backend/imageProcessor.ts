import sharp from "sharp";

const TARGET_SIZE = 224;

interface ImageTensor {
  data: Float32Array;
  shape: [number, number, number];
  width: number;
  height: number;
}

/**
 * Fast preprocessing: single sharp pipeline to resize and extract raw RGB.
 */
export async function preprocessImage(buffer: Buffer): Promise<ImageTensor> {
  try {
    const raw = await sharp(buffer)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "centre" })
      .removeAlpha()
      .toColorspace("srgb")
      .raw()
      .toBuffer();

    const tensor = new Float32Array(TARGET_SIZE * TARGET_SIZE * 3);
    for (let i = 0; i < raw.length; i++) {
      tensor[i] = raw[i];
    }

    return {
      data: tensor,
      shape: [TARGET_SIZE, TARGET_SIZE, 3],
      width: TARGET_SIZE,
      height: TARGET_SIZE,
    };
  } catch (error) {
    // Fallback to a more permissive pipeline if colorspace conversion fails.
    try {
      const png = await sharp(buffer)
        .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "centre" })
        .toFormat("png")
        .toBuffer();

      const raw = await sharp(png).raw().toBuffer();
      const tensor = new Float32Array(TARGET_SIZE * TARGET_SIZE * 3);
      for (let i = 0; i < raw.length; i++) {
        tensor[i] = raw[i];
      }

      return {
        data: tensor,
        shape: [TARGET_SIZE, TARGET_SIZE, 3],
        width: TARGET_SIZE,
        height: TARGET_SIZE,
      };
    } catch (fallbackError) {
      throw new Error(
        `Image preprocessing failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
    }
  }
}

export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
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
