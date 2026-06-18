/**
 * Text Input Validator Service
 * Validates text descriptions for website generation
 *
 * Requirements: 1.1, 1.6
 */

import { VALIDATION } from '@/lib/constants';
import { ValidationResult } from './types';

/**
 * Validates text input for website generation
 *
 * Validates:
 * - Input is not empty or whitespace-only
 * - Input meets minimum length requirement (10 characters)
 * - Input does not exceed maximum length (10,000 characters)
 *
 * Requirement 1.1: Validate that input is non-empty and contains at least 10 characters
 * Requirement 1.6: Reject input that exceeds 10,000 characters
 *
 * @param text - The text input to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateTextInput(text: string): ValidationResult {
  // Check for null/undefined (defensive, though TypeScript enforces string type)
  if (text === null || text === undefined) {
    return {
      valid: false,
      error: 'Text input is required',
    };
  }

  // Trim whitespace to check for empty or whitespace-only input
  const trimmedText = text.trim();

  // Check for empty or whitespace-only input
  if (trimmedText.length === 0) {
    return {
      valid: false,
      error: 'Text input cannot be empty or contain only whitespace',
    };
  }

  // Check minimum length requirement (Requirement 1.1)
  // Use trimmed length for minimum check to ensure meaningful content
  if (trimmedText.length < VALIDATION.TEXT_INPUT.MIN_LENGTH) {
    return {
      valid: false,
      error: `Text input must be at least ${VALIDATION.TEXT_INPUT.MIN_LENGTH} characters`,
    };
  }

  // Check maximum length requirement (Requirement 1.6)
  // Use original text length for maximum check to account for all characters
  if (text.length > VALIDATION.TEXT_INPUT.MAX_LENGTH) {
    return {
      valid: false,
      error: `Text input cannot exceed ${VALIDATION.TEXT_INPUT.MAX_LENGTH.toLocaleString()} characters`,
    };
  }

  return {
    valid: true,
  };
}

/**
 * TextInputValidator class providing text validation functionality
 * Alternative class-based API for text input validation
 */
export class TextInputValidator {
  /**
   * Validates text input for website generation
   *
   * @param text - The text input to validate
   * @returns ValidationResult with valid flag and optional error message
   */
  validate(text: string): ValidationResult {
    return validateTextInput(text);
  }

  /**
   * Checks if the input is empty or whitespace-only
   *
   * @param text - The text to check
   * @returns true if empty or whitespace-only
   */
  isEmpty(text: string): boolean {
    return text === null || text === undefined || text.trim().length === 0;
  }

  /**
   * Gets the minimum length requirement
   */
  get minLength(): number {
    return VALIDATION.TEXT_INPUT.MIN_LENGTH;
  }

  /**
   * Gets the maximum length requirement
   */
  get maxLength(): number {
    return VALIDATION.TEXT_INPUT.MAX_LENGTH;
  }
}

/**
 * Default TextInputValidator instance
 */
export const textInputValidator = new TextInputValidator();

export default textInputValidator;
