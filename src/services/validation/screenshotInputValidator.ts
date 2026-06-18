/**
 * Screenshot Input Validator Service
 * Validates screenshot/image uploads for website generation
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8
 *
 * Validates:
 * - MIME type (PNG, JPEG, WebP only)
 * - File size (max 10MB)
 * - Image dimensions (min 200x200 pixels)
 */

import { VALIDATION } from '@/lib/constants';
import { ValidationResult } from './types';

/**
 * Allowed MIME types for screenshot uploads
 */
const ALLOWED_MIME_TYPES = VALIDATION.SCREENSHOT_INPUT.ALLOWED_TYPES;

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_SIZE_BYTES = VALIDATION.SCREENSHOT_INPUT.MAX_SIZE_BYTES;

/**
 * Minimum image dimensions
 */
const MIN_WIDTH = VALIDATION.SCREENSHOT_INPUT.MIN_WIDTH;
const MIN_HEIGHT = VALIDATION.SCREENSHOT_INPUT.MIN_HEIGHT;

/**
 * Error messages for validation failures
 */
const ERROR_MESSAGES = {
  INVALID_TYPE: `Invalid file format. Supported formats: PNG, JPEG, WebP.`,
  FILE_TOO_LARGE: `File size exceeds the maximum limit of 10MB.`,
  DIMENSIONS_TOO_SMALL: `Image dimensions must be at least ${MIN_WIDTH}x${MIN_HEIGHT} pixels.`,
  INVALID_FILE: 'Please provide a valid image file.',
} as const;

/**
 * ScreenshotInputValidator interface
 */
export interface ScreenshotInputValidator {
  validateScreenshotInput(file: File): Promise<ValidationResult>;
  validateMimeType(mimeType: string): ValidationResult;
  validateFileSize(sizeBytes: number): ValidationResult;
  validateDimensions(width: number, height: number): ValidationResult;
}

/**
 * Validates that the file has an allowed MIME type
 *
 * Requirement 2.1: Validate the file is an image (PNG, JPG, JPEG, or WebP format)
 * Requirement 2.6: Reject upload with error if not a valid image format
 *
 * @param mimeType - The MIME type of the file
 * @returns ValidationResult indicating if the MIME type is valid
 */
export function validateMimeType(mimeType: string): ValidationResult {
  const isValid = (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);

  if (!isValid) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_TYPE,
    };
  }

  return { valid: true };
}

/**
 * Validates that the file size is within the allowed limit
 *
 * Requirement 2.2: Validate the file size does not exceed 10MB
 * Requirement 2.7: Reject upload with error if image exceeds size limit
 *
 * @param sizeBytes - The file size in bytes
 * @returns ValidationResult indicating if the file size is valid
 */
export function validateFileSize(sizeBytes: number): ValidationResult {
  if (sizeBytes > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }

  return { valid: true };
}

/**
 * Validates that the image dimensions meet the minimum requirements
 *
 * Requirement 2.3: Validate the image dimensions are at least 200x200 pixels
 * Requirement 2.8: Reject upload with error if dimensions are below minimum
 *
 * @param width - The image width in pixels
 * @param height - The image height in pixels
 * @returns ValidationResult indicating if the dimensions are valid
 */
export function validateDimensions(width: number, height: number): ValidationResult {
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return {
      valid: false,
      error: ERROR_MESSAGES.DIMENSIONS_TOO_SMALL,
    };
  }

  return { valid: true };
}

/**
 * Gets image dimensions from a File object
 *
 * @param file - The image file to measure
 * @returns Promise resolving to width and height
 * @throws Error if the file cannot be read as an image
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validates a screenshot file for website generation
 *
 * Validates in order:
 * 1. MIME type (must be PNG, JPEG, or WebP)
 * 2. File size (must not exceed 10MB)
 * 3. Image dimensions (must be at least 200x200 pixels)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8
 *
 * @param file - The file to validate
 * @returns Promise resolving to ValidationResult
 */
export async function validateScreenshotInput(file: File): Promise<ValidationResult> {
  // Validate file exists
  if (!file) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_FILE,
    };
  }

  // Validate MIME type first (Requirement 2.1, 2.6)
  const mimeTypeResult = validateMimeType(file.type);
  if (!mimeTypeResult.valid) {
    return mimeTypeResult;
  }

  // Validate file size (Requirement 2.2, 2.7)
  const sizeResult = validateFileSize(file.size);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  // Validate image dimensions (Requirement 2.3, 2.8)
  try {
    const { width, height } = await getImageDimensions(file);
    const dimensionsResult = validateDimensions(width, height);
    if (!dimensionsResult.valid) {
      return dimensionsResult;
    }
  } catch {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_FILE,
    };
  }

  return { valid: true };
}

/**
 * Default ScreenshotInputValidator implementation
 */
const screenshotInputValidator: ScreenshotInputValidator = {
  validateScreenshotInput,
  validateMimeType,
  validateFileSize,
  validateDimensions,
};

export default screenshotInputValidator;
