/**
 * Validation Functions
 *
 * Contains validation functions for user input validation across the application.
 */

/**
 * Maximum allowed length for originalPrompt field
 * Matches the existing input validation limit
 */
export const MAX_ORIGINAL_PROMPT_LENGTH = 10_000;

/**
 * Validates the length of an originalPrompt string.
 *
 * @param prompt - The prompt string to validate
 * @returns true if the prompt length is valid (<= 10,000 characters), false otherwise
 *
 * **Validates: Requirement 0.2** - THE `originalPrompt` field SHALL be a string
 * with a maximum length of 10,000 characters
 */
export function isValidOriginalPromptLength(prompt: string): boolean {
  // Handle null/undefined by treating them as invalid (require actual string)
  if (prompt === null || prompt === undefined) {
    return false;
  }

  // Check if the prompt length is within the allowed limit
  return prompt.length <= MAX_ORIGINAL_PROMPT_LENGTH;
}
