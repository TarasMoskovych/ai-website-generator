/**
 * Website Data Validator
 *
 * Validates website data structures according to business rules.
 * Ensures data integrity for the GeneratedWebsite and CreateWebsiteData types.
 *
 * Requirements:
 * - 0.1: Store originalPrompt for text-generated websites
 * - 0.2: originalPrompt max length of 10,000 characters
 * - 0.3: originalPrompt must be null for screenshot-generated websites
 */

import { CreateWebsiteData, GeneratedWebsite } from '@/types/website';

/**
 * Maximum allowed length for originalPrompt field
 * Matches the existing input validation limit
 */
export const MAX_ORIGINAL_PROMPT_LENGTH = 10000;

/**
 * Result of website data validation
 */
export interface WebsiteDataValidationResult {
  /** Whether the data is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Validates that the originalPrompt field follows the input type rules:
 * - For text input: originalPrompt can be a non-empty string (max 10,000 chars)
 * - For screenshot input: originalPrompt MUST be null or undefined
 *
 * @param inputType - The type of input used to generate the website
 * @param originalPrompt - The original prompt value to validate
 * @returns Validation result with valid flag and optional error message
 *
 * Validates: Requirements 0.2, 0.3
 */
export function validateOriginalPrompt(
  inputType: 'text' | 'screenshot',
  originalPrompt: string | null | undefined
): WebsiteDataValidationResult {
  // Rule 1: For screenshot input, originalPrompt must be null or undefined
  // Requirement 0.3: WHEN a website is generated from a screenshot,
  // THE originalPrompt field SHALL be set to null or omitted
  if (inputType === 'screenshot') {
    if (originalPrompt !== null && originalPrompt !== undefined) {
      return {
        valid: false,
        error: 'Screenshot-generated websites must have null originalPrompt',
      };
    }
    return { valid: true };
  }

  // Rule 2: For text input, validate length if prompt is provided
  // Requirement 0.2: originalPrompt max length of 10,000 characters
  if (inputType === 'text' && originalPrompt !== null && originalPrompt !== undefined) {
    if (originalPrompt.length > MAX_ORIGINAL_PROMPT_LENGTH) {
      return {
        valid: false,
        error: `originalPrompt exceeds maximum length of ${MAX_ORIGINAL_PROMPT_LENGTH} characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates a CreateWebsiteData object for data integrity
 *
 * @param data - The website data to validate
 * @returns Validation result with valid flag and optional error message
 */
export function validateCreateWebsiteData(
  data: CreateWebsiteData
): WebsiteDataValidationResult {
  // Validate originalPrompt based on inputType
  const promptResult = validateOriginalPrompt(data.inputType, data.originalPrompt);
  if (!promptResult.valid) {
    return promptResult;
  }

  return { valid: true };
}

/**
 * Checks if a website data object follows the screenshot generation rule:
 * Screenshot-generated websites must have originalPrompt as null.
 *
 * This is a convenience function for the property test.
 *
 * @param inputType - The input type of the website
 * @param originalPrompt - The original prompt value
 * @returns True if the data follows the screenshot generation rule
 *
 * Validates: Requirement 0.3
 */
export function isValidScreenshotWebsiteData(
  inputType: 'text' | 'screenshot',
  originalPrompt: string | null | undefined
): boolean {
  if (inputType === 'screenshot') {
    return originalPrompt === null || originalPrompt === undefined;
  }
  return true;
}
