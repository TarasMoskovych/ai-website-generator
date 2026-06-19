/**
 * Text-Based Website Generation Service
 *
 * Implements text-based website generation using Claude API.
 * Sends text descriptions to the Claude API with the TEXT_GENERATION_PROMPT.
 * Supports both streaming and non-streaming modes.
 *
 * Requirements: 1.2, 1.8, 17.1-17.7, 18.1-18.4
 */

import {
  anthropic,
  CLAUDE_MODEL,
  MAX_TOKENS,
  TEXT_GENERATION_PROMPT,
  ClaudeResponse,
} from '@/lib/claude';
import { TIMEOUTS } from '@/lib/constants';
import { GenerationResult } from '@/types/generation';
import { extractCodeFromResponse } from './codeExtractor';

/**
 * Error codes for text generation failures
 */
export enum TextGenerationErrorCode {
  TIMEOUT = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTRACTION_FAILED = 'GENERATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CANCELLED = 'CANCELLED',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for text generation failures
 */
export class TextGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: TextGenerationErrorCode,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'TextGenerationError';
  }
}

/**
 * Stream event types for real-time updates
 */
export type StreamEventType = 'start' | 'text' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  result?: GenerationResult;
  error?: string;
}

/**
 * Generates website HTML and CSS from a text description using Claude API with streaming.
 *
 * This function streams the response in real-time, allowing the client to see
 * the content as it's being generated.
 *
 * @param description - The text description of the website to generate
 * @param signal - Optional AbortSignal for request cancellation
 * @returns AsyncGenerator yielding StreamEvents
 */
export async function* generateWebsiteFromTextStream(
  description: string,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  // Create an AbortController to handle the 60-second timeout
  const controller = new AbortController();

  // Set up timeout handler (60 seconds)
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUTS.GENERATION);

  // If an external signal is provided, link it to our controller
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      yield { type: 'error', error: 'Request was cancelled' };
      return;
    }

    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  try {
    // Emit start event
    yield { type: 'start' };

    let fullContent = '';

    // Stream from Claude API
    const stream = await anthropic.messages.stream(
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: `${TEXT_GENERATION_PROMPT}\n\nDescription: ${description}`,
          },
        ],
      },
      {
        signal: controller.signal,
      }
    );

    // Process stream events
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          fullContent += delta.text;
          yield { type: 'text', content: delta.text };
        }
      }
    }

    // Clear timeout on successful completion
    clearTimeout(timeoutId);

    // Extract HTML, CSS, and title from the complete response
    const extractionResult = extractCodeFromResponse(fullContent);

    if (!extractionResult.success) {
      yield { type: 'error', error: extractionResult.error || 'Failed to extract code from response' };
      return;
    }

    // Emit done event with final result
    yield {
      type: 'done',
      result: {
        html: extractionResult.html,
        css: extractionResult.css,
        title: extractionResult.title,
      },
    };
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Handle abort/timeout errors
    if (error instanceof Error) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        if (signal?.aborted) {
          yield { type: 'error', error: 'Generation was cancelled' };
        } else {
          yield { type: 'error', error: 'Request timed out after 2 minutes. Please try again.' };
        }
        return;
      }

      if (error.message.includes('rate_limit')) {
        yield { type: 'error', error: 'Rate limit exceeded. Please wait a few minutes and try again.' };
        return;
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        yield { type: 'error', error: 'Unable to connect. Please check your internet connection.' };
        return;
      }

      yield { type: 'error', error: `Failed to generate website: ${error.message}` };
      return;
    }

    yield { type: 'error', error: 'Failed to generate website: An unknown error occurred' };
  }
}

/**
 * Generates website HTML and CSS from a text description using Claude API.
 *
 * This function:
 * - Sends the description to Claude's API with the TEXT_GENERATION_PROMPT
 * - Handles 60-second timeout with AbortSignal
 * - Returns the generated HTML, CSS, and title
 *
 * Requirements:
 * - 1.2: Send description to Claude API for processing with 60-second timeout
 * - 1.8: Handle timeout errors
 * - 17.1-17.7: Generate semantic HTML5, accessible, responsive CSS
 * - 18.1-18.4: Include dark theme support
 *
 * @param description - The text description of the website to generate
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Promise resolving to GenerationResult with HTML, CSS, and title
 * @throws TextGenerationError if API request fails, times out, or is aborted
 */
export async function generateWebsiteFromText(
  description: string,
  signal?: AbortSignal
): Promise<GenerationResult> {
  // Create an AbortController to handle the 60-second timeout
  const controller = new AbortController();

  // Set up timeout handler (60 seconds as per Requirement 1.2)
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUTS.GENERATION);

  // If an external signal is provided, link it to our controller
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw new TextGenerationError(
        'Request was cancelled',
        TextGenerationErrorCode.CANCELLED
      );
    }

    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  try {
    // Call Claude API (Requirement 1.2)
    const response = await callClaudeAPI(description, controller.signal);

    // Clear timeout on successful completion
    clearTimeout(timeoutId);

    // Extract HTML, CSS, and title from the response
    const extractionResult = extractCodeFromResponse(response.content);

    if (!extractionResult.success) {
      throw new TextGenerationError(
        extractionResult.error || 'Failed to extract code from response',
        TextGenerationErrorCode.EXTRACTION_FAILED
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

    // Re-throw if already a TextGenerationError
    if (error instanceof TextGenerationError) {
      throw error;
    }

    // Handle abort/timeout errors (Requirement 1.8)
    if (error instanceof Error) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        // Check if it was our timeout or external abort
        if (signal?.aborted) {
          throw new TextGenerationError(
            'Generation was cancelled',
            TextGenerationErrorCode.CANCELLED
          );
        }
        throw new TextGenerationError(
          'Request timed out after 2 minutes. Please try again.',
          TextGenerationErrorCode.TIMEOUT
        );
      }

      // Handle rate limiting errors
      if (error.message.includes('rate_limit')) {
        throw new TextGenerationError(
          'Rate limit exceeded. Please wait a few minutes and try again.',
          TextGenerationErrorCode.RATE_LIMIT
        );
      }

      // Handle network errors
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new TextGenerationError(
          'Unable to connect. Please check your internet connection.',
          TextGenerationErrorCode.NETWORK_ERROR
        );
      }

      // Re-throw API errors with context (Requirement 1.5)
      throw new TextGenerationError(
        `Failed to generate website: ${error.message}`,
        TextGenerationErrorCode.API_ERROR
      );
    }

    throw new TextGenerationError(
      'Failed to generate website: An unknown error occurred',
      TextGenerationErrorCode.UNKNOWN
    );
  }
}

/**
 * Makes the actual API call to Claude for text-based generation
 */
async function callClaudeAPI(
  description: string,
  signal: AbortSignal
): Promise<ClaudeResponse> {
  const message = await anthropic.messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: `${TEXT_GENERATION_PROMPT}\n\nDescription: ${description}`,
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

export default generateWebsiteFromText;
