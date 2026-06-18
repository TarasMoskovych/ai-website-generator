/**
 * Title Validator Service
 * Validates website titles according to the application requirements
 *
 * Requirements: 11.5, 11.6
 * Property 16: Title Length Validation
 */

import { VALIDATION } from '@/lib/constants';
import { ValidationResult } from './types';

/**
 * Extended result of title validation including sanitized title
 */
export interface TitleValidationResult extends ValidationResult {
  /** Sanitized title (trimmed and cleaned) */
  sanitizedTitle?: string;
}

/**
 * Title validation error messages
 */
export const TITLE_VALIDATION_ERRORS = {
  EMPTY: 'Title cannot be empty',
  WHITESPACE_ONLY: 'Title cannot contain only whitespace',
  TOO_SHORT: `Title must be at least ${VALIDATION.TITLE.MIN_LENGTH} character`,
  TOO_LONG: `Title cannot exceed ${VALIDATION.TITLE.MAX_LENGTH} characters`,
} as const;

/**
 * Checks if a string is empty or contains only whitespace
 * @param value - The string to check
 * @returns true if the string is empty or whitespace-only
 */
function isEmptyOrWhitespace(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Sanitizes a title by trimming whitespace and normalizing special characters
 * @param title - The raw title to sanitize
 * @returns The sanitized title
 */
export function sanitizeTitle(title: string): string {
  // Trim leading and trailing whitespace
  let sanitized = title.trim();

  // Normalize multiple consecutive spaces to a single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove control characters (non-printable characters)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validates a website title according to requirements
 *
 * Property 16: Title Length Validation
 * For any title string, the title validator SHALL accept the title
 * if and only if the string length is between 1 and 100 characters inclusive.
 *
 * Requirement 11.5: Validate that the title contains between 1 and 100 characters
 * Requirement 11.6: Display error message indicating title length requirements
 *
 * @param title - The title to validate
 * @returns TitleValidationResult with validity status and optional error message
 */
export function validateTitle(title: string): TitleValidationResult {
  // Check for null/undefined (defensive)
  if (title === null || title === undefined) {
    return {
      valid: false,
      error: TITLE_VALIDATION_ERRORS.EMPTY,
    };
  }

  // Check for empty string
  if (title.length === 0) {
    return {
      valid: false,
      error: TITLE_VALIDATION_ERRORS.EMPTY,
    };
  }

  // Check for whitespace-only input
  if (isEmptyOrWhitespace(title)) {
    return {
      valid: false,
      error: TITLE_VALIDATION_ERRORS.WHITESPACE_ONLY,
    };
  }

  // Sanitize the title
  const sanitized = sanitizeTitle(title);

  // After sanitization, check if it's empty
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: TITLE_VALIDATION_ERRORS.EMPTY,
    };
  }

  // Check minimum length (1 character after sanitization)
  if (sanitized.length < VALIDATION.TITLE.MIN_LENGTH) {
    return {
      valid: false,
      error: TITLE_VALIDATION_ERRORS.TOO_SHORT,
    };
  }

  // Check maximum length (100 characters)
  if (sanitized.length > VALIDATION.TITLE.MAX_LENGTH) {
    return {
      valid: false,
      error: TITLE_VALIDATION_ERRORS.TOO_LONG,
    };
  }

  // Title is valid
  return {
    valid: true,
    sanitizedTitle: sanitized,
  };
}

/**
 * TitleValidator class for object-oriented usage pattern
 */
export class TitleValidator {
  /**
   * Validates a website title
   * @param title - The title to validate
   * @returns TitleValidationResult with validity status and optional error message
   */
  validate(title: string): TitleValidationResult {
    return validateTitle(title);
  }

  /**
   * Sanitizes a title without full validation
   * @param title - The title to sanitize
   * @returns The sanitized title
   */
  sanitize(title: string): string {
    return sanitizeTitle(title);
  }

  /**
   * Checks if a title is valid (quick boolean check)
   * @param title - The title to check
   * @returns true if the title is valid
   */
  isValid(title: string): boolean {
    return validateTitle(title).valid;
  }
}

/**
 * Default TitleValidator instance for convenience
 */
export const titleValidator = new TitleValidator();

export default titleValidator;
