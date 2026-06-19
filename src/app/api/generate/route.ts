/**
 * Website Generation API Route
 *
 * Handles POST requests for generating websites from text descriptions
 * or screenshot images using the Claude API.
 *
 * Requirements:
 * - 1.2, 2.4: Send to Claude API for processing
 * - 14.1: Authentication required
 *
 * @see design.md for API interfaces
 */

import { NextRequest } from 'next/server';
import { verifyIdToken, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import { generateWebsiteFromText, TextGenerationError } from '@/services/generation/textGeneration';
import {
  generateWebsiteFromImage,
  ScreenshotGenerationError,
  ImageMimeType,
} from '@/services/generation/screenshotGeneration';
import { processImageForClaude } from '@/services/imageProcessor';
import { ErrorCode } from '@/types/error';

/**
 * Maximum duration for this route in seconds.
 * Vercel Hobby: up to 60s, Pro: up to 300s (5 min)
 * Set to 60s for Hobby plan compatibility.
 */
export const maxDuration = 60;

/**
 * Request types for website generation
 */
interface GenerateTextRequest {
  type: 'text';
  description: string;
}

interface GenerateScreenshotRequest {
  type: 'screenshot';
  image: string; // Base64 encoded
  mimeType: string;
}

type GenerateRequest = GenerateTextRequest | GenerateScreenshotRequest;

/**
 * Success response structure
 */
interface GenerateSuccessResponse {
  success: true;
  html: string;
  css: string;
  title: string;
}

/**
 * Error response structure
 */
interface GenerateErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  retryAfter?: number;
}

/**
 * Valid MIME types for screenshot input
 */
const VALID_MIME_TYPES: ImageMimeType[] = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Validation constants
 */
const VALIDATION = {
  TEXT_MIN_LENGTH: 10,
  TEXT_MAX_LENGTH: 10_000,
};

/**
 * Verifies the Firebase ID token from the Authorization header.
 *
 * @param request - The incoming request
 * @returns The user's UID if authenticated, null otherwise
 */
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  // Check if Firebase Admin is configured
  if (!isFirebaseAdminConfigured()) {
    console.error('Firebase Admin SDK is not configured');
    return null;
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix


  console.log(token);

  try {
    const decodedToken = await verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Validates a text generation request.
 *
 * Requirements:
 * - 1.1: Input must be non-empty with at least 10 characters
 * - 1.6: Input must not exceed 10,000 characters
 *
 * @param body - The request body to validate
 * @returns Error message if invalid, null if valid
 */
function validateTextRequest(body: GenerateTextRequest): string | null {
  if (!body.description || typeof body.description !== 'string') {
    return 'Description is required and must be a string';
  }

  const trimmedLength = body.description.trim().length;

  if (trimmedLength < VALIDATION.TEXT_MIN_LENGTH) {
    return `Description must be at least ${VALIDATION.TEXT_MIN_LENGTH} characters`;
  }

  if (body.description.length > VALIDATION.TEXT_MAX_LENGTH) {
    return `Description must not exceed ${VALIDATION.TEXT_MAX_LENGTH} characters`;
  }

  return null;
}

/**
 * Validates a screenshot generation request.
 *
 * Requirements:
 * - 2.1: Image must be valid (PNG, JPG, JPEG, WebP)
 *
 * @param body - The request body to validate
 * @returns Error message if invalid, null if valid
 */
function validateScreenshotRequest(body: GenerateScreenshotRequest): string | null {
  if (!body.image || typeof body.image !== 'string') {
    return 'Image is required and must be a base64 encoded string';
  }

  if (!body.mimeType || typeof body.mimeType !== 'string') {
    return 'MIME type is required';
  }

  if (!VALID_MIME_TYPES.includes(body.mimeType as ImageMimeType)) {
    return `Invalid image format. Supported formats: ${VALID_MIME_TYPES.join(', ')}`;
  }

  // Basic base64 validation - check if it looks like valid base64
  try {
    // Check if the base64 string is valid by attempting a small decode
    const testDecode = Buffer.from(body.image.slice(0, 100), 'base64');
    if (testDecode.length === 0 && body.image.length > 0) {
      return 'Invalid base64 encoded image';
    }
  } catch {
    return 'Invalid base64 encoded image';
  }

  return null;
}

/**
 * Creates an error response.
 *
 * @param message - User-friendly error message
 * @param code - Error code for categorization
 * @param status - HTTP status code
 * @param retryAfter - Optional retry delay in seconds
 */
function errorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  retryAfter?: number
): Response {
  const body: GenerateErrorResponse = {
    success: false,
    error: message,
    code,
    ...(retryAfter !== undefined && { retryAfter }),
  };

  return Response.json(body, { status });
}

/**
 * Maps generation errors to error responses.
 *
 * @param error - The caught error
 * @returns Appropriate error response
 */
function handleGenerationError(error: unknown): Response {
  // Handle TextGenerationError
  if (error instanceof TextGenerationError) {
    switch (error.code) {
      case 'TIMEOUT_ERROR':
        return errorResponse(error.message, 'TIMEOUT_ERROR', 408);
      case 'RATE_LIMIT_ERROR':
        return errorResponse(error.message, 'RATE_LIMIT_ERROR', 429, error.retryAfter);
      case 'CANCELLED':
        return errorResponse(error.message, 'API_ERROR', 499);
      case 'NETWORK_ERROR':
        return errorResponse(error.message, 'NETWORK_ERROR', 503);
      case 'GENERATION_ERROR':
        return errorResponse(error.message, 'GENERATION_ERROR', 500);
      default:
        return errorResponse(error.message, 'API_ERROR', 500);
    }
  }

  // Handle ScreenshotGenerationError
  if (error instanceof ScreenshotGenerationError) {
    switch (error.code) {
      case 'TIMEOUT_ERROR':
        return errorResponse(error.message, 'TIMEOUT_ERROR', 408);
      case 'RATE_LIMIT_ERROR':
        return errorResponse(error.message, 'RATE_LIMIT_ERROR', 429, error.retryAfter);
      case 'CANCELLED':
        return errorResponse(error.message, 'API_ERROR', 499);
      case 'NETWORK_ERROR':
        return errorResponse(error.message, 'NETWORK_ERROR', 503);
      case 'GENERATION_ERROR':
        return errorResponse(error.message, 'GENERATION_ERROR', 500);
      default:
        return errorResponse(error.message, 'API_ERROR', 500);
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    console.error('Generation error:', error);
    return errorResponse(
      'An unexpected error occurred during generation',
      'UNKNOWN_ERROR',
      500
    );
  }

  return errorResponse('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
}

/**
 * POST handler for website generation.
 *
 * Authenticates the request, validates the input, and calls the appropriate
 * generation function based on the request type (text or screenshot).
 *
 * @param request - The incoming POST request
 * @returns Generated website content or error response
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Verify authentication (Requirement 14.1)
  const userId = await verifyAuthToken(request);

  if (!userId) {
    return errorResponse(
      'Authentication required. Please sign in to generate websites.',
      'AUTH_ERROR',
      401
    );
  }

  // Parse request body
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      'Invalid JSON in request body',
      'VALIDATION_ERROR',
      400
    );
  }

  // Validate request type
  if (!body.type || (body.type !== 'text' && body.type !== 'screenshot')) {
    return errorResponse(
      'Invalid request type. Must be "text" or "screenshot"',
      'VALIDATION_ERROR',
      400
    );
  }

  // Handle text generation request
  if (body.type === 'text') {
    const validationError = validateTextRequest(body);
    if (validationError) {
      return errorResponse(validationError, 'VALIDATION_ERROR', 400);
    }

    try {
      const result = await generateWebsiteFromText(body.description);

      const response: GenerateSuccessResponse = {
        success: true,
        html: result.html,
        css: result.css,
        title: result.title,
      };

      return Response.json(response);
    } catch (error) {
      return handleGenerationError(error);
    }
  }

  // Handle screenshot generation request
  if (body.type === 'screenshot') {
    const validationError = validateScreenshotRequest(body);
    if (validationError) {
      return errorResponse(validationError, 'VALIDATION_ERROR', 400);
    }

    try {
      // Process image to ensure it doesn't exceed Claude's dimension limit
      const processedImage = await processImageForClaude(
        body.image,
        body.mimeType as ImageMimeType
      );

      if (processedImage.wasResized) {
        console.log(
          `Image resized from ${processedImage.originalWidth}x${processedImage.originalHeight} to ${processedImage.finalWidth}x${processedImage.finalHeight}`
        );
      }

      const result = await generateWebsiteFromImage(
        processedImage.base64,
        processedImage.mimeType
      );

      const response: GenerateSuccessResponse = {
        success: true,
        html: result.html,
        css: result.css,
        title: result.title,
      };

      return Response.json(response);
    } catch (error) {
      return handleGenerationError(error);
    }
  }

  // This should never be reached due to type validation above
  return errorResponse('Invalid request', 'VALIDATION_ERROR', 400);
}
