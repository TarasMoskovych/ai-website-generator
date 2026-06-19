/**
 * Error Handling Utilities
 * Provides global error handling utilities for the application
 *
 * Features:
 * - Maps API errors to user-friendly messages
 * - Implements retry logic (max 3 attempts)
 * - Handles rate limiting with wait times
 * - Handles network errors, API errors, timeout errors
 *
 * Requirements: 12.1, 12.2, 12.3
 */

import {
  type ErrorCode,
  type AppError,
  ERROR_CODES,
  ERROR_MESSAGES,
  createAppError,
} from '@/types/error';
import { MAX_RETRY_ATTEMPTS } from '@/lib/constants';

/**
 * Default delay between retry attempts in milliseconds
 */
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Backoff multiplier for exponential backoff
 */
const BACKOFF_MULTIPLIER = 2;

/**
 * User-friendly error messages mapped by error code
 */
export const ERROR_MESSAGE_MAP: Record<ErrorCode, string> = {
  [ERROR_CODES.VALIDATION_ERROR]:
    'Please check your input and try again.',
  [ERROR_CODES.NETWORK_ERROR]:
    'Unable to connect. Please check your internet connection.',
  [ERROR_CODES.API_ERROR]:
    'Generation failed. Please try again.',
  [ERROR_CODES.RATE_LIMIT_ERROR]:
    'Rate limit reached. Please wait before trying again.',
  [ERROR_CODES.TIMEOUT_ERROR]:
    'Request timed out. Please try again.',
  [ERROR_CODES.GENERATION_ERROR]:
    'Failed to generate valid website code.',
  [ERROR_CODES.STORAGE_ERROR]:
    'Failed to save. Please try again.',
  [ERROR_CODES.AUTH_ERROR]:
    'Authentication failed. Please sign in again.',
  [ERROR_CODES.UNKNOWN_ERROR]:
    'An unexpected error occurred.',
};

/**
 * Gets a user-friendly error message for a given error code
 *
 * @param code - The error code
 * @returns User-friendly error message
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGE_MAP[code] ?? ERROR_MESSAGES[code];
}

/**
 * Gets a user-friendly error message with rate limit wait time
 *
 * @param code - The error code
 * @param retryAfter - Seconds to wait before retry (for rate limiting)
 * @returns User-friendly error message with wait time if applicable
 */
export function getErrorMessageWithWaitTime(
  code: ErrorCode,
  retryAfter?: number
): string {
  if (code === ERROR_CODES.RATE_LIMIT_ERROR && retryAfter !== undefined) {
    const minutes = Math.ceil(retryAfter / 60);
    return `Rate limit reached. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
  }
  return getErrorMessage(code);
}

/**
 * Options for the withRetry function
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay between retries in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Whether to use exponential backoff (default: true) */
  useExponentialBackoff?: boolean;
  /** Callback called on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
  /** Predicate to determine if an error is retryable (default: isRetryableError) */
  shouldRetry?: (error: Error) => boolean;
  /** AbortSignal to cancel retries */
  signal?: AbortSignal;
}

/**
 * Determines if an error is retryable
 * Network errors, timeout errors, and some API errors are retryable
 * Rate limit errors, validation errors, and auth errors are not retryable
 *
 * @param error - The error to check
 * @returns Whether the error is retryable
 */
export function isRetryableError(error: Error | AppError): boolean {
  // Check if it's an AppError with an error code
  if (isAppError(error)) {
    const nonRetryableCodes: ErrorCode[] = [
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_CODES.AUTH_ERROR,
      ERROR_CODES.RATE_LIMIT_ERROR,
    ];
    return !nonRetryableCodes.includes(error.code);
  }

  // Check for specific error types by message or name
  const errorMessage = error.message?.toLowerCase() ?? '';
  const errorName = error.name?.toLowerCase() ?? '';

  // Network errors are retryable
  if (
    errorName === 'typeerror' &&
    (errorMessage.includes('fetch') || errorMessage.includes('network'))
  ) {
    return true;
  }

  // Timeout errors are retryable
  if (errorName === 'aborterror' || errorMessage.includes('timeout')) {
    return true;
  }

  // Generic network-related errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound')
  ) {
    return true;
  }

  // Server errors (5xx) are retryable
  if (errorMessage.includes('500') || errorMessage.includes('503') || errorMessage.includes('502')) {
    return true;
  }

  // Default to not retryable for safety
  return false;
}

/**
 * Type guard to check if an error is an AppError
 *
 * @param error - The error to check
 * @returns Whether the error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).code === 'string' &&
    typeof (error as AppError).message === 'string'
  );
}

/**
 * Wraps an async function with retry logic
 * Retries the function up to maxAttempts times with exponential backoff
 *
 * @param fn - The async function to wrap
 * @param options - Retry options
 * @returns The result of the function
 * @throws AppError if all retry attempts fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchData(),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error.message)
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    initialDelayMs = DEFAULT_RETRY_DELAY_MS,
    useExponentialBackoff = true,
    onRetry,
    shouldRetry = isRetryableError,
    signal,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if aborted before attempting
    if (signal?.aborted) {
      throw createAppError(
        ERROR_CODES.TIMEOUT_ERROR,
        'Operation was cancelled',
        'AbortSignal was triggered'
      );
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if:
      // 1. This was the last attempt
      // 2. The error is not retryable
      // 3. The operation was aborted
      const isLastAttempt = attempt >= maxAttempts;
      const isErrorRetryable = shouldRetry(lastError);

      if (isLastAttempt || !isErrorRetryable || signal?.aborted) {
        break;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Calculate delay with exponential backoff
      const delay = useExponentialBackoff
        ? initialDelayMs * Math.pow(BACKOFF_MULTIPLIER, attempt - 1)
        : initialDelayMs;

      // Wait before retrying
      await sleep(delay, signal);
    }
  }

  // All attempts failed, throw the appropriate error
  throw normalizeError(lastError);
}

/**
 * Sleeps for a given duration, can be cancelled via AbortSignal
 *
 * @param ms - Duration in milliseconds
 * @param signal - Optional AbortSignal to cancel sleep
 */
async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Operation was cancelled'));
      }, { once: true });
    }
  });
}

/**
 * Rate limit response structure from API
 */
export interface RateLimitResponse {
  /** HTTP status code (typically 429) */
  status?: number;
  /** Error response from API */
  error?: {
    type?: string;
    message?: string;
  };
  /** Headers from the response */
  headers?: {
    'retry-after'?: string;
    'x-ratelimit-reset'?: string;
    'ratelimit-reset'?: string;
  };
  /** Retry after value in seconds (may be in response body) */
  retryAfter?: number;
}

/**
 * Parses a rate limit response to extract the wait time in seconds
 *
 * @param response - The rate limit response from the API
 * @returns Wait time in seconds, or undefined if not found
 */
export function parseRateLimitWaitTime(
  response: RateLimitResponse | Response | unknown
): number | undefined {
  // Handle direct retryAfter value
  if (
    typeof response === 'object' &&
    response !== null &&
    'retryAfter' in response &&
    typeof (response as RateLimitResponse).retryAfter === 'number'
  ) {
    return (response as RateLimitResponse).retryAfter;
  }

  // Handle Response object with headers
  if (response instanceof Response) {
    return parseRateLimitFromHeaders(response.headers);
  }

  // Handle object with headers
  if (
    typeof response === 'object' &&
    response !== null &&
    'headers' in response
  ) {
    const headers = (response as RateLimitResponse).headers;
    if (headers) {
      // Check various header formats
      const retryAfter = headers['retry-after'];
      if (retryAfter) {
        return parseRetryAfterValue(retryAfter);
      }

      // Check x-ratelimit-reset (Unix timestamp)
      const resetTimestamp = headers['x-ratelimit-reset'] ?? headers['ratelimit-reset'];
      if (resetTimestamp) {
        return parseResetTimestamp(resetTimestamp);
      }
    }
  }

  return undefined;
}

/**
 * Parses rate limit information from HTTP headers
 *
 * @param headers - HTTP headers
 * @returns Wait time in seconds, or undefined if not found
 */
export function parseRateLimitFromHeaders(headers: Headers): number | undefined {
  // Check Retry-After header
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    return parseRetryAfterValue(retryAfter);
  }

  // Check X-RateLimit-Reset header (Unix timestamp)
  const resetTimestamp =
    headers.get('x-ratelimit-reset') ?? headers.get('ratelimit-reset');
  if (resetTimestamp) {
    return parseResetTimestamp(resetTimestamp);
  }

  return undefined;
}

/**
 * Parses a Retry-After header value
 * Can be either a number of seconds or an HTTP date
 *
 * @param value - The Retry-After header value
 * @returns Wait time in seconds
 */
function parseRetryAfterValue(value: string): number {
  // Try parsing as a number (seconds)
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds)) {
    return Math.max(0, seconds);
  }

  // Try parsing as an HTTP date
  const date = Date.parse(value);
  if (!isNaN(date)) {
    const waitTime = Math.ceil((date - Date.now()) / 1000);
    return Math.max(0, waitTime);
  }

  // Default to 60 seconds if unparseable
  return 60;
}

/**
 * Parses a reset timestamp (Unix timestamp) to wait time in seconds
 *
 * @param timestamp - Unix timestamp (seconds since epoch)
 * @returns Wait time in seconds
 */
function parseResetTimestamp(timestamp: string): number {
  const resetTime = parseInt(timestamp, 10);
  if (isNaN(resetTime)) {
    return 60; // Default to 60 seconds
  }

  // Calculate seconds until reset
  const nowSeconds = Math.floor(Date.now() / 1000);
  const waitTime = resetTime - nowSeconds;
  return Math.max(0, waitTime);
}

/**
 * Normalizes various error types to AppError
 *
 * @param error - The error to normalize
 * @returns AppError with appropriate code and message
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Handle Error instance
  if (error instanceof Error) {
    return categorizeError(error);
  }

  // Handle string error
  if (typeof error === 'string') {
    return createAppError(ERROR_CODES.UNKNOWN_ERROR, error);
  }

  // Handle unknown error
  return createAppError(
    ERROR_CODES.UNKNOWN_ERROR,
    'An unexpected error occurred',
    String(error)
  );
}

/**
 * Categorizes an Error instance into the appropriate AppError type
 *
 * @param error - The error to categorize
 * @returns AppError with appropriate code and message
 */
export function categorizeError(error: Error): AppError {
  const message = error.message?.toLowerCase() ?? '';
  const name = error.name?.toLowerCase() ?? '';

  // Timeout errors
  if (name === 'aborterror' || message.includes('timeout') || message.includes('aborted')) {
    return createAppError(
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.TIMEOUT_ERROR],
      error.message
    );
  }

  // Network errors
  if (
    name === 'typeerror' ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return createAppError(
      ERROR_CODES.NETWORK_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.NETWORK_ERROR],
      error.message
    );
  }

  // Rate limit errors
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return createAppError(
      ERROR_CODES.RATE_LIMIT_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.RATE_LIMIT_ERROR],
      error.message
    );
  }

  // Authentication errors
  if (
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return createAppError(
      ERROR_CODES.AUTH_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.AUTH_ERROR],
      error.message
    );
  }

  // Validation errors
  if (message.includes('valid') || message.includes('invalid') || message.includes('required')) {
    return createAppError(
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.VALIDATION_ERROR],
      error.message
    );
  }

  // Storage/database errors
  if (
    message.includes('storage') ||
    message.includes('firestore') ||
    message.includes('database') ||
    message.includes('save')
  ) {
    return createAppError(
      ERROR_CODES.STORAGE_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.STORAGE_ERROR],
      error.message
    );
  }

  // API errors (general server errors)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('server')) {
    return createAppError(
      ERROR_CODES.API_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.API_ERROR],
      error.message
    );
  }

  // Default to unknown error
  return createAppError(
    ERROR_CODES.UNKNOWN_ERROR,
    ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN_ERROR],
    error.message
  );
}

/**
 * Creates an AppError from an HTTP response
 *
 * @param response - The HTTP response
 * @param defaultMessage - Default message if none can be extracted
 * @returns AppError with appropriate code and message
 */
export async function createErrorFromResponse(
  response: Response,
  defaultMessage?: string
): Promise<AppError> {
  const status = response.status;

  // Handle rate limiting
  if (status === 429) {
    const retryAfter = parseRateLimitFromHeaders(response.headers);
    return createAppError(
      ERROR_CODES.RATE_LIMIT_ERROR,
      getErrorMessageWithWaitTime(ERROR_CODES.RATE_LIMIT_ERROR, retryAfter),
      `Rate limit exceeded. Status: ${status}`,
      retryAfter
    );
  }

  // Handle authentication errors
  if (status === 401 || status === 403) {
    return createAppError(
      ERROR_CODES.AUTH_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.AUTH_ERROR],
      `Authentication error. Status: ${status}`
    );
  }

  // Handle validation errors
  if (status === 400 || status === 422) {
    let message = defaultMessage ?? ERROR_MESSAGE_MAP[ERROR_CODES.VALIDATION_ERROR];
    try {
      const body = await response.json();
      if (body.error?.message) {
        message = body.error.message;
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Ignore JSON parsing errors
    }
    return createAppError(
      ERROR_CODES.VALIDATION_ERROR,
      message,
      `Validation error. Status: ${status}`
    );
  }

  // Handle not found errors
  if (status === 404) {
    return createAppError(
      ERROR_CODES.API_ERROR,
      'The requested resource was not found.',
      `Not found. Status: ${status}`
    );
  }

  // Handle server errors
  if (status >= 500) {
    return createAppError(
      ERROR_CODES.API_ERROR,
      ERROR_MESSAGE_MAP[ERROR_CODES.API_ERROR],
      `Server error. Status: ${status}`
    );
  }

  // Default error
  return createAppError(
    ERROR_CODES.UNKNOWN_ERROR,
    defaultMessage ?? ERROR_MESSAGE_MAP[ERROR_CODES.UNKNOWN_ERROR],
    `Unexpected error. Status: ${status}`
  );
}

/**
 * Wrapper for fetch that includes error handling
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns The response if successful
 * @throws AppError if the request fails
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw await createErrorFromResponse(response);
    }

    return response;
  } catch (error) {
    // Re-throw if already an AppError
    if (isAppError(error)) {
      throw error;
    }

    // Normalize other errors
    throw normalizeError(error);
  }
}

/**
 * Wrapper for fetch with retry logic
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns The response if successful
 * @throws AppError if all retry attempts fail
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    () => fetchWithErrorHandling(url, options),
    retryOptions
  );
}

/**
 * Error handling service singleton
 */
export const errorHandlingService = {
  getErrorMessage,
  getErrorMessageWithWaitTime,
  withRetry,
  isRetryableError,
  isAppError,
  parseRateLimitWaitTime,
  parseRateLimitFromHeaders,
  normalizeError,
  categorizeError,
  createErrorFromResponse,
  fetchWithErrorHandling,
  fetchWithRetry,
};

export default errorHandlingService;
