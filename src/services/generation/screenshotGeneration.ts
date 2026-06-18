/**
 * Screenshot-Based Website Generation Service
 *
 * Implements screenshot-based website generation using Claude's vision capabilities.
 * Sends images as base64 to the Claude API with the SCREENSHOT_GENERATION_PROMPT.
 *
 * Requirements: 2.4, 2.5, 2.9, 17.1-17.7, 18.1-18.4
 */

import {
  anthropic,
  CLAUDE_MODEL,
  MAX_TOKENS,
  SCREENSHOT_GENERATION_PROMPT,
  ClaudeResponse,
} from '@/lib/claude';
import { TIMEOUTS } from '@/lib/constants';
import { GenerationResult } from '@/types/generation';
import { extractCodeFromResponse } from './codeExtractor';

/**
 * Supported MIME types for screenshot input
 */
export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * Error codes for screenshot generation failures
 */
export enum ScreenshotGenerationErrorCode {
  TIMEOUT = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTRACTION_FAILED = 'GENERATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for screenshot generation failures
 */
export class ScreenshotGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: ScreenshotGenerationErrorCode,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'ScreenshotGenerationError';
  }
}

/**
 * Generates website HTML and CSS from a screenshot image using Claude's vision capabilities.
 *
 * This function:
 * - Sends the image as base64 to Claude's vision API
 * - Uses the SCREENSHOT_GENERATION_PROMPT to instruct Claude on how to replicate the design
 * - Handles 60-second timeout with AbortSignal
 * - Returns the generated HTML, CSS, and title
 *
 * Requirements:
 * - 2.4: Encode image and send to Claude API with vision capabilities
 * - 2.5: Extract HTML/CSS that replicates the screenshot design
 * - 2.9: Handle Claude API errors
 * - 17.1-17.7: Generate semantic HTML5, accessible, responsive CSS
 * - 18.1-18.4: Include dark theme support
 *
 * @param imageBase64 - The base64-encoded image data (without data URL prefix)
 * @param mimeType - The MIME type of the image (image/png, image/jpeg, or image/webp)
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Promise resolving to GenerationResult with HTML, CSS, and title
 * @throws ScreenshotGenerationError if API request fails, times out, or is aborted
 */
export async function generateWebsiteFromImage(
  imageBase64: string,
  mimeType: ImageMimeType,
  signal?: AbortSignal
): Promise<GenerationResult> {
  // Create an AbortController to handle the 60-second timeout
  const controller = new AbortController();

  // Set up timeout handler (60 seconds as per Requirement 2.4)
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUTS.GENERATION);

  // If an external signal is provided, link it to our controller
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new ScreenshotGenerationError(
        'Request was cancelled',
        ScreenshotGenerationErrorCode.CANCELLED
      );
    }

    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  try {
    // Call Claude API with vision capabilities (Requirement 2.4)
    const response = await callClaudeVisionAPI(imageBase64, mimeType, controller.signal);

    // Clear timeout on successful completion
    clearTimeout(timeoutId);

    // Extract HTML, CSS, and title from the response (Requirement 2.5)
    const extractionResult = extractCodeFromResponse(response.content);

    if (!extractionResult.success) {
      throw new ScreenshotGenerationError(
        extractionResult.error || 'Failed to extract code from response',
        ScreenshotGenerationErrorCode.EXTRACTION_FAILED
      );
    }

    return {
      html: extractionResult.html,
      css: extractionResult.css,
      title: extractionResult.title,
    };
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Re-throw if already a ScreenshotGenerationError
    if (error instanceof ScreenshotGenerationError) {
      throw error;
    }

    // Handle abort/timeout errors (Requirement 2.9)
    if (error instanceof Error) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        // Check if it was our timeout or external abort
        if (signal?.aborted) {
          throw new ScreenshotGenerationError(
            'Generation was cancelled',
            ScreenshotGenerationErrorCode.CANCELLED
          );
        }
        throw new ScreenshotGenerationError(
          'Request timed out after 60 seconds. Please try again.',
          ScreenshotGenerationErrorCode.TIMEOUT
        );
      }

      // Handle rate limiting errors
      if (error.message.includes('rate_limit')) {
        throw new ScreenshotGenerationError(
          'Rate limit exceeded. Please wait a few minutes and try again.',
          ScreenshotGenerationErrorCode.RATE_LIMIT
        );
      }

      // Handle network errors
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new ScreenshotGenerationError(
          'Unable to connect. Please check your internet connection.',
          ScreenshotGenerationErrorCode.NETWORK_ERROR
        );
      }

      // Re-throw API errors with context (Requirement 2.9)
      throw new ScreenshotGenerationError(
        `Failed to generate website from screenshot: ${error.message}`,
        ScreenshotGenerationErrorCode.API_ERROR
      );
    }

    throw new ScreenshotGenerationError(
      'Failed to generate website from screenshot: An unknown error occurred',
      ScreenshotGenerationErrorCode.UNKNOWN
    );
  }
}

/**
 * Makes the actual API call to Claude for screenshot-based generation using vision capabilities.
 */
async function callClaudeVisionAPI(
  imageBase64: string,
  mimeType: ImageMimeType,
  signal: AbortSignal
): Promise<ClaudeResponse> {
  const message = await anthropic.messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: SCREENSHOT_GENERATION_PROMPT,
            },
          ],
        },
      ],
    },
    {
      signal,
    }
  );

  // Extract text content from the response
  const content =
    message.content[0].type === 'text' ? message.content[0].text : '';

  return {
    content,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

export default generateWebsiteFromImage;
