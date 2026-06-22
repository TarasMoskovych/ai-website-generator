/**
 * Website Data Validator Tests
 *
 * Property-based tests for website data validation.
 * Tests verify the constraints on originalPrompt field based on inputType.
 *
 * Validates: Requirements 0.2, 0.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateOriginalPrompt,
  validateCreateWebsiteData,
  isValidScreenshotWebsiteData,
  MAX_ORIGINAL_PROMPT_LENGTH,
} from './websiteDataValidator';
import { CreateWebsiteData } from '@/types/website';

describe('WebsiteDataValidator', () => {
  describe('validateOriginalPrompt', () => {
    /**
     * Unit tests for text input type
     */
    describe('text input type', () => {
      it('should accept null originalPrompt for text input', () => {
        const result = validateOriginalPrompt('text', null);
        expect(result.valid).toBe(true);
      });

      it('should accept undefined originalPrompt for text input', () => {
        const result = validateOriginalPrompt('text', undefined);
        expect(result.valid).toBe(true);
      });

      it('should accept valid string originalPrompt for text input', () => {
        const result = validateOriginalPrompt('text', 'Create a landing page');
        expect(result.valid).toBe(true);
      });

      it('should accept empty string originalPrompt for text input', () => {
        const result = validateOriginalPrompt('text', '');
        expect(result.valid).toBe(true);
      });

      it('should accept originalPrompt at max length for text input', () => {
        const maxLengthPrompt = 'a'.repeat(MAX_ORIGINAL_PROMPT_LENGTH);
        const result = validateOriginalPrompt('text', maxLengthPrompt);
        expect(result.valid).toBe(true);
      });

      it('should reject originalPrompt exceeding max length for text input', () => {
        const tooLongPrompt = 'a'.repeat(MAX_ORIGINAL_PROMPT_LENGTH + 1);
        const result = validateOriginalPrompt('text', tooLongPrompt);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds maximum length');
      });
    });

    /**
     * Unit tests for screenshot input type
     * Validates: Requirement 0.3
     */
    describe('screenshot input type', () => {
      it('should accept null originalPrompt for screenshot input', () => {
        const result = validateOriginalPrompt('screenshot', null);
        expect(result.valid).toBe(true);
      });

      it('should accept undefined originalPrompt for screenshot input', () => {
        const result = validateOriginalPrompt('screenshot', undefined);
        expect(result.valid).toBe(true);
      });

      it('should reject non-null originalPrompt for screenshot input', () => {
        const result = validateOriginalPrompt('screenshot', 'Some prompt');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Screenshot-generated websites must have null originalPrompt');
      });

      it('should reject empty string originalPrompt for screenshot input', () => {
        const result = validateOriginalPrompt('screenshot', '');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Screenshot-generated websites must have null originalPrompt');
      });
    });
  });

  describe('isValidScreenshotWebsiteData', () => {
    it('should return true for screenshot with null originalPrompt', () => {
      expect(isValidScreenshotWebsiteData('screenshot', null)).toBe(true);
    });

    it('should return true for screenshot with undefined originalPrompt', () => {
      expect(isValidScreenshotWebsiteData('screenshot', undefined)).toBe(true);
    });

    it('should return false for screenshot with string originalPrompt', () => {
      expect(isValidScreenshotWebsiteData('screenshot', 'prompt')).toBe(false);
    });

    it('should return true for text with any originalPrompt', () => {
      expect(isValidScreenshotWebsiteData('text', 'prompt')).toBe(true);
      expect(isValidScreenshotWebsiteData('text', null)).toBe(true);
      expect(isValidScreenshotWebsiteData('text', undefined)).toBe(true);
    });
  });

  describe('validateCreateWebsiteData', () => {
    /**
     * Helper to create valid base website data
     */
    const createBaseWebsiteData = (
      inputType: 'text' | 'screenshot',
      originalPrompt: string | null
    ): CreateWebsiteData => ({
      title: 'Test Website',
      html: '<html><body>Hello</body></html>',
      css: 'body { margin: 0; }',
      thumbnailUrl: 'data:image/png;base64,test',
      inputType,
      originalPrompt,
      isPublic: true,
    });

    it('should accept valid text-generated website data', () => {
      const data = createBaseWebsiteData('text', 'Create a landing page');
      const result = validateCreateWebsiteData(data);
      expect(result.valid).toBe(true);
    });

    it('should accept valid screenshot-generated website data with null prompt', () => {
      const data = createBaseWebsiteData('screenshot', null);
      const result = validateCreateWebsiteData(data);
      expect(result.valid).toBe(true);
    });

    it('should reject screenshot-generated website data with non-null prompt', () => {
      // Force the type to bypass TypeScript check for testing purposes
      const data = {
        ...createBaseWebsiteData('screenshot', null),
        originalPrompt: 'Invalid prompt for screenshot',
      };
      const result = validateCreateWebsiteData(data);
      expect(result.valid).toBe(false);
    });
  });

  /**
   * Property-Based Tests
   *
   * These tests verify universal properties across generated inputs using fast-check.
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: website-beautify, Property 3: Screenshot Generation Excludes Original Prompt
     *
     * *For any* website generated from a screenshot, the `originalPrompt` field SHALL be null or undefined.
     *
     * **Validates: Requirements 0.3**
     */
    it('screenshot generation excludes original prompt (Property 3)', () => {
      // Generate arbitrary non-null strings to test that they ALL fail validation
      // when inputType is 'screenshot'
      fc.assert(
        fc.property(
          // Generate random string prompts (non-null, non-undefined)
          fc.string({ minLength: 0, maxLength: 1000 }),
          (arbitraryPrompt) => {
            // When inputType is 'screenshot' and originalPrompt is a string (not null/undefined),
            // the validation MUST fail
            const result = validateOriginalPrompt('screenshot', arbitraryPrompt);

            // Property assertion: For screenshot input, ANY string originalPrompt
            // (including empty string) MUST be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Screenshot-generated websites must have null originalPrompt');

            // Also verify using the convenience function
            expect(isValidScreenshotWebsiteData('screenshot', arbitraryPrompt)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Complementary property: Screenshot with null/undefined is always valid
     *
     * This ensures the inverse case - when originalPrompt IS null or undefined
     * for screenshot input, validation passes.
     *
     * **Validates: Requirements 0.3**
     */
    it('screenshot generation with null/undefined prompt is always valid (Property 3 complement)', () => {
      fc.assert(
        fc.property(
          // Generate either null or undefined
          fc.constantFrom(null, undefined),
          (nullishValue) => {
            // When inputType is 'screenshot' and originalPrompt is null or undefined,
            // validation MUST pass
            const result = validateOriginalPrompt('screenshot', nullishValue);

            // Property assertion: For screenshot input, null/undefined originalPrompt
            // MUST be valid
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();

            // Also verify using the convenience function
            expect(isValidScreenshotWebsiteData('screenshot', nullishValue)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 2: Original Prompt Length Validation
     *
     * *For any* string with length greater than 10,000 characters, the system
     * SHALL reject it as an invalid originalPrompt.
     *
     * **Validates: Requirements 0.2**
     */
    it('original prompt length validation (Property 2)', () => {
      fc.assert(
        fc.property(
          // Generate strings longer than the max length
          fc.string({ minLength: MAX_ORIGINAL_PROMPT_LENGTH + 1, maxLength: MAX_ORIGINAL_PROMPT_LENGTH + 1000 }),
          (tooLongPrompt) => {
            // Ensure the generated string is actually too long
            expect(tooLongPrompt.length).toBeGreaterThan(MAX_ORIGINAL_PROMPT_LENGTH);

            // For text input, too-long prompts should be rejected
            const result = validateOriginalPrompt('text', tooLongPrompt);

            // Property assertion: Any string longer than MAX_ORIGINAL_PROMPT_LENGTH
            // MUST be rejected for text input
            expect(result.valid).toBe(false);
            expect(result.error).toContain('exceeds maximum length');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Complementary property: Original prompts within limit are accepted for text input
     *
     * **Validates: Requirements 0.2**
     */
    it('original prompts within limit are accepted for text input (Property 2 complement)', () => {
      fc.assert(
        fc.property(
          // Generate strings within the max length (including edge case at exactly max)
          fc.string({ minLength: 0, maxLength: MAX_ORIGINAL_PROMPT_LENGTH }),
          (validPrompt) => {
            // Ensure the generated string is within limits
            expect(validPrompt.length).toBeLessThanOrEqual(MAX_ORIGINAL_PROMPT_LENGTH);

            // For text input, valid-length prompts should be accepted
            const result = validateOriginalPrompt('text', validPrompt);

            // Property assertion: Any string within MAX_ORIGINAL_PROMPT_LENGTH
            // MUST be accepted for text input
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Text input type allows any valid-length originalPrompt
     *
     * For text input, null, undefined, or any string up to MAX_ORIGINAL_PROMPT_LENGTH
     * should be accepted.
     */
    it('text input type allows null, undefined, or valid-length strings', () => {
      // Generator for valid originalPrompt values for text input
      const validTextPrompt = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.string({ minLength: 0, maxLength: MAX_ORIGINAL_PROMPT_LENGTH })
      );

      fc.assert(
        fc.property(validTextPrompt, (prompt) => {
          const result = validateOriginalPrompt('text', prompt);

          // Property assertion: For text input, null/undefined/valid-length strings
          // MUST all be accepted
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });
  });
});
