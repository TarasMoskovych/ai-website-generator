/**
 * Streaming Website Generation API Route
 *
 * Handles POST requests for generating websites with real-time streaming response.
 * Uses Server-Sent Events (SSE) to stream content as it's generated.
 * Supports both text and screenshot generation.
 *
 * Requirements:
 * - 1.2, 2.4: Send to Claude API for processing
 * - 14.1: Authentication required
 */

import { NextRequest } from 'next/server';
import { verifyIdToken, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import { generateWebsiteFromTextStream } from '@/services/generation/textGeneration';
import {
  generateWebsiteFromImageStream,
  ImageMimeType,
} from '@/services/generation/screenshotGeneration';
import { processImageForClaude } from '@/services/imageProcessor';

/**
 * Maximum duration for this route in seconds.
 * Vercel Hobby: up to 60s, Pro: up to 300s (5 min)
 * Set to 60s for Hobby plan compatibility.
 */
export const maxDuration = 60;

/**
 * Request types for streaming generation
 */
interface GenerateTextStreamRequest {
  type: 'text';
  description: string;
}

interface GenerateScreenshotStreamRequest {
  type: 'screenshot';
  image: string; // Base64 encoded
  mimeType: string;
}

type GenerateStreamRequest = GenerateTextStreamRequest | GenerateScreenshotStreamRequest;

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
 */
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  if (!isFirebaseAdminConfigured()) {
    console.error('Firebase Admin SDK is not configured');
    return null;
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

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
 */
function validateTextRequest(body: GenerateTextStreamRequest): string | null {
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
 */
function validateScreenshotRequest(body: GenerateScreenshotStreamRequest): string | null {
  if (!body.image || typeof body.image !== 'string') {
    return 'Image is required and must be a base64 encoded string';
  }

  if (!body.mimeType || typeof body.mimeType !== 'string') {
    return 'MIME type is required';
  }

  if (!VALID_MIME_TYPES.includes(body.mimeType as ImageMimeType)) {
    return `Invalid image format. Supported formats: ${VALID_MIME_TYPES.join(', ')}`;
  }

  // Basic base64 validation
  try {
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
 * Creates SSE formatted message
 */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST handler for streaming website generation.
 *
 * Returns a Server-Sent Events stream with real-time generation progress.
 * Events:
 * - start: Generation has started
 * - text: New text chunk received
 * - done: Generation complete with final result
 * - error: An error occurred
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Verify authentication
  const userId = await verifyAuthToken(request);

  if (!userId) {
    return new Response(
      formatSSE('error', { error: 'Authentication required' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  // Parse request body
  let body: GenerateStreamRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      formatSSE('error', { error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  // Validate request type
  if (!body.type || (body.type !== 'text' && body.type !== 'screenshot')) {
    return new Response(
      formatSSE('error', { error: 'Invalid request type. Must be "text" or "screenshot"' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  // Validate based on request type
  if (body.type === 'text') {
    const validationError = validateTextRequest(body);
    if (validationError) {
      return new Response(formatSSE('error', { error: validationError }), {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } else if (body.type === 'screenshot') {
    const validationError = validateScreenshotRequest(body);
    if (validationError) {
      return new Response(formatSSE('error', { error: validationError }), {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }
  }

  // Create a TransformStream to convert async generator to ReadableStream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Choose the appropriate generator based on request type
        let generator;

        if (body.type === 'text') {
          generator = generateWebsiteFromTextStream(body.description);
        } else {
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

          generator = generateWebsiteFromImageStream(
            processedImage.base64,
            processedImage.mimeType
          );
        }

        for await (const event of generator) {
          const sseMessage = formatSSE(event.type, {
            content: event.content,
            result: event.result,
            error: event.error,
          });
          controller.enqueue(encoder.encode(sseMessage));
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(formatSSE('error', { error: errorMessage }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
