/**
 * Image Processing Service
 *
 * Provides utilities for processing images before sending to Claude API.
 * Handles resizing images that exceed the maximum dimension limit (8000px).
 */

import { VALIDATION } from '@/lib/constants';
import sharp from 'sharp';

/**
 * Maximum dimension allowed by Claude API
 */
const MAX_DIMENSION = VALIDATION.SCREENSHOT_INPUT.MAX_DIMENSION;

/**
 * Supported MIME types for image processing
 */
export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Result of image processing
 */
export interface ProcessedImage {
  /** Base64-encoded image data (without data URL prefix) */
  base64: string;
  /** MIME type of the processed image */
  mimeType: ImageMimeType;
  /** Original width before processing */
  originalWidth: number;
  /** Original height before processing */
  originalHeight: number;
  /** Final width after processing */
  finalWidth: number;
  /** Final height after processing */
  finalHeight: number;
  /** Whether the image was resized */
  wasResized: boolean;
}

/**
 * Processes an image for Claude API submission.
 * Resizes the image if either dimension exceeds the maximum allowed (7680px, leaving buffer below 8000px limit).
 *
 * @param base64Data - Base64-encoded image data (without data URL prefix)
 * @param mimeType - MIME type of the image
 * @returns Promise resolving to ProcessedImage with potentially resized image
 */
export async function processImageForClaude(
  base64Data: string,
  mimeType: ImageMimeType
): Promise<ProcessedImage> {
  // Decode base64 to buffer
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Check if resizing is needed
  const maxDimension = Math.max(originalWidth, originalHeight);

  if (maxDimension <= MAX_DIMENSION) {
    // No resizing needed
    return {
      base64: base64Data,
      mimeType,
      originalWidth,
      originalHeight,
      finalWidth: originalWidth,
      finalHeight: originalHeight,
      wasResized: false,
    };
  }

  // Calculate new dimensions maintaining aspect ratio
  const scale = MAX_DIMENSION / maxDimension;
  const newWidth = Math.round(originalWidth * scale);
  const newHeight = Math.round(originalHeight * scale);

  // Resize the image
  const sharpInstance = sharp(imageBuffer).resize(newWidth, newHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Convert to appropriate format
  let outputBuffer: Buffer;
  let outputMimeType: ImageMimeType = mimeType;

  switch (mimeType) {
    case 'image/jpeg':
      outputBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
      break;
    case 'image/webp':
      outputBuffer = await sharpInstance.webp({ quality: 90 }).toBuffer();
      break;
    case 'image/png':
    default:
      outputBuffer = await sharpInstance.png({ compressionLevel: 6 }).toBuffer();
      outputMimeType = 'image/png';
      break;
  }

  // Convert back to base64
  const resizedBase64 = outputBuffer.toString('base64');

  return {
    base64: resizedBase64,
    mimeType: outputMimeType,
    originalWidth,
    originalHeight,
    finalWidth: newWidth,
    finalHeight: newHeight,
    wasResized: true,
  };
}

/**
 * Gets the dimensions of a base64-encoded image.
 *
 * @param base64Data - Base64-encoded image data
 * @returns Promise resolving to width and height
 */
export async function getImageDimensions(
  base64Data: string
): Promise<{ width: number; height: number }> {
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const metadata = await sharp(imageBuffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Validates that an image's dimensions are within Claude API limits.
 *
 * @param base64Data - Base64-encoded image data
 * @returns Promise resolving to validation result
 */
export async function validateImageDimensions(
  base64Data: string
): Promise<{ valid: boolean; error?: string; width: number; height: number }> {
  const { width, height } = await getImageDimensions(base64Data);

  if (width > 8000 || height > 8000) {
    return {
      valid: false,
      error: `Image dimensions (${width}x${height}) exceed the maximum allowed (8000x8000 pixels)`,
      width,
      height,
    };
  }

  return { valid: true, width, height };
}

/**
 * Image Processor Service implementation
 */
const imageProcessorService = {
  processImageForClaude,
  getImageDimensions,
  validateImageDimensions,
};

export default imageProcessorService;
