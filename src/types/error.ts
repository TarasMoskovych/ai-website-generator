/**
 * Error Types
 * Defines types for application error handling
 */

/**
 * Error codes for categorizing application errors
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'GENERATION_ERROR'
  | 'STORAGE_ERROR'
  | 'AUTH_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error codes as a const object for use in switch statements
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  GENERATION_ERROR: 'GENERATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Application error with structured information
 */
export interface AppError {
  /** Error category code */
  code: ErrorCode;
  /** User-friendly error message */
  message: string;
  /** Additional technical details (not shown to users) */
  details?: string;
  /** Seconds to wait before retry (for rate limiting) */
  retryAfter?: number;
}

/**
 * User-friendly error messages for each error code
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  API_ERROR: 'Generation failed. Please try again.',
  RATE_LIMIT_ERROR: 'Rate limit reached. Please wait before trying again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  GENERATION_ERROR: 'Failed to generate valid website code.',
  STORAGE_ERROR: 'Failed to save. Please try again.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

/**
 * Creates an AppError from a code and optional details
 */
export function createAppError(
  code: ErrorCode,
  customMessage?: string,
  details?: string,
  retryAfter?: number
): AppError {
  return {
    code,
    message: customMessage ?? ERROR_MESSAGES[code],
    details,
    retryAfter,
  };
}
