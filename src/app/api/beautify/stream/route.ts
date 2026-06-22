/**
 * Beautify Stream API Route
 *
 * Handles POST requests for streaming website beautification.
 * This endpoint uses Server-Sent Events (SSE) to provide real-time
 * progress updates during the beautification process.
 *
 * Requirements:
 * - 4.1: POST endpoint at /api/beautify/stream
 * - 4.2, 4.3: Firebase authentication via Bearer token
 * - 4.4, 4.5: Request validation for required fields
 * - 4.6: Fetch originalPrompt from Firestore if not provided
 * - 4.7, 4.8: Reference image MIME type validation
 * - 4.9: SSE response with Content-Type text/event-stream
 * - 4.11: Maximum duration of 120 seconds
 *
 * @see design.md for API interfaces
 */

import { NextRequest } from 'next/server';
import { verifyIdToken, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import { beautifyWebsiteStream, detectCompleteness } from '@/services/beautify';
import { getById as getWebsiteById } from '@/services/websiteRepository';
import type { BeautifyStreamRequest, ReferenceImageMimeType, BeautifyStreamEvent } from '@/types/beautify';

/**
 * Maximum duration for this route in seconds.
 * Validates: Requirement 4.11 - THE Beautify_API SHALL have a maximum duration of 120 seconds
 */
export const maxDuration = 120;

/**
 * Valid MIME types for reference images
 * Validates: Requirement 4.7 - Reference image MIME type validation
 */
const VALID_MIME_TYPES: ReferenceImageMimeType[] = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Validates that a string is well-formed base64.
 * Checks for valid base64 characters and proper padding.
 *
 * @param str - The string to validate
 * @returns true if the string is valid base64, false otherwise
 */
function isValidBase64(str: string): boolean {
  // Empty string is not valid base64 for an image
  if (!str || str.length === 0) {
    return false;
  }

  // Base64 regex: only valid base64 characters with optional padding
  // Valid characters: A-Z, a-z, 0-9, +, /
  // Padding: = at the end (0, 1, or 2)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  // Check if string contains only valid base64 characters
  if (!base64Regex.test(str)) {
    return false;
  }

  // Base64 string length must be a multiple of 4 (with padding)
  if (str.length % 4 !== 0) {
    return false;
  }

  // Try to decode to verify it's valid
  try {
    // Use atob in browser or Buffer in Node.js
    if (typeof atob === 'function') {
      atob(str);
    } else {
      Buffer.from(str, 'base64');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Validates: Requirements 4.2, 4.3
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

  try {
    const decodedToken = await verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Validates the request body for beautification.
 * Validates: Requirements 4.4, 4.5, 4.7, 4.8
 *
 * @param body - The request body to validate
 * @returns Object with valid flag and optional error message
 */
function validateRequest(body: unknown): { valid: true; data: BeautifyStreamRequest } | { valid: false; error: string } {
  // Check if body is an object
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const request = body as Record<string, unknown>;

  // Validate required field: websiteId
  if (!request.websiteId || typeof request.websiteId !== 'string') {
    return { valid: false, error: 'websiteId is required and must be a string' };
  }

  // Validate required field: html
  if (!request.html || typeof request.html !== 'string') {
    return { valid: false, error: 'html is required and must be a string' };
  }

  // Validate required field: css
  if (!request.css || typeof request.css !== 'string') {
    return { valid: false, error: 'css is required and must be a string' };
  }

  // Validate optional field: originalPrompt
  if (request.originalPrompt !== undefined && typeof request.originalPrompt !== 'string') {
    return { valid: false, error: 'originalPrompt must be a string if provided' };
  }

  // Validate reference image fields together
  // Validates: Requirements 4.7, 4.8
  if (request.referenceImage !== undefined) {
    if (typeof request.referenceImage !== 'string') {
      return { valid: false, error: 'referenceImage must be a base64 encoded string' };
    }

    // Validate base64 format
    if (!isValidBase64(request.referenceImage)) {
      return { valid: false, error: 'referenceImage must be a valid base64 encoded string' };
    }

    // If referenceImage is provided, referenceImageMimeType must also be provided
    if (!request.referenceImageMimeType) {
      return { valid: false, error: 'referenceImageMimeType is required when referenceImage is provided' };
    }

    if (typeof request.referenceImageMimeType !== 'string') {
      return { valid: false, error: 'referenceImageMimeType must be a string' };
    }

    // Validate MIME type
    if (!VALID_MIME_TYPES.includes(request.referenceImageMimeType as ReferenceImageMimeType)) {
      return {
        valid: false,
        error: `Invalid referenceImageMimeType. Supported types: ${VALID_MIME_TYPES.join(', ')}`,
      };
    }
  }

  return {
    valid: true,
    data: {
      websiteId: request.websiteId as string,
      html: request.html as string,
      css: request.css as string,
      originalPrompt: request.originalPrompt as string | undefined,
      referenceImage: request.referenceImage as string | undefined,
      referenceImageMimeType: request.referenceImageMimeType as ReferenceImageMimeType | undefined,
    },
  };
}

/**
 * Formats a BeautifyStreamEvent as an SSE message.
 *
 * @param event - The event to format
 * @returns Formatted SSE string
 */
function formatSSEMessage(event: BeautifyStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Creates an SSE error response.
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @returns SSE Response with error event
 */
function errorResponse(message: string, status: number): Response {
  const errorEvent: BeautifyStreamEvent = {
    type: 'error',
    error: message,
  };

  return new Response(formatSSEMessage(errorEvent), {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * POST handler for streaming website beautification.
 *
 * Authenticates the request, validates the input, runs completeness detection,
 * and streams beautification progress via Server-Sent Events.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 4.10, 4.11
 *
 * @param request - The incoming POST request
 * @returns Streaming SSE response with beautification events
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Verify authentication (Requirements 4.2, 4.3)
  const userId = await verifyAuthToken(request);

  if (!userId) {
    return errorResponse(
      'Authentication required. Please sign in to beautify websites.',
      401
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  // Validate request (Requirements 4.4, 4.5, 4.7, 4.8)
  const validation = validateRequest(body);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  const requestData = validation.data;

  // Fetch originalPrompt from Firestore if not provided in request
  // Validates: Requirements 4.6, 0.5, 0.6
  let originalPrompt = requestData.originalPrompt;
  if (!originalPrompt) {
    try {
      const website = await getWebsiteById(requestData.websiteId);
      if (website?.originalPrompt) {
        originalPrompt = website.originalPrompt;
      }
    } catch (error) {
      // Log but don't fail - originalPrompt is optional context
      console.warn('Failed to fetch originalPrompt from website:', error);
    }
  }

  // Create a readable stream for SSE response
  // Validates: Requirement 4.9 - SSE response with Content-Type text/event-stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Run completeness detection on the HTML/CSS
        // Validates: Requirement 4.10 - Wire up completeness detection
        const completenessResult = detectCompleteness(requestData.html, requestData.css);

        // Create abort controller for cancellation support
        const abortController = new AbortController();

        // Stream beautification events
        for await (const event of beautifyWebsiteStream(
          {
            html: requestData.html,
            css: requestData.css,
            originalPrompt: originalPrompt,
            referenceImage: requestData.referenceImage,
            referenceImageMimeType: requestData.referenceImageMimeType,
            completenessResult,
          },
          abortController.signal
        )) {
          // Send event as SSE message
          controller.enqueue(encoder.encode(formatSSEMessage(event)));

          // If error or done event, close the stream
          if (event.type === 'error' || event.type === 'done') {
            break;
          }
        }
      } catch (error) {
        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        const errorEvent: BeautifyStreamEvent = {
          type: 'error',
          error: errorMessage,
        };
        controller.enqueue(encoder.encode(formatSSEMessage(errorEvent)));
      } finally {
        controller.close();
      }
    },
  });

  // Return SSE response
  // Validates: Requirement 4.9 - Content-Type text/event-stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
