/**
 * Validation Functions Tests
 *
 * Unit tests and property-based tests for validation functions.
 * Tests cover originalPrompt length validation.
 *
 * Validates: Requirements 0.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidOriginalPromptLength,
  MAX_ORIGINAL_PROMPT_LENGTH,
} from './validation';

describe('Validation Functions', () => {
  describe('MAX_ORIGINAL_PROMPT_LENGTH constant', () => {
    it('should be 10,000', () => {
      expect(MAX_ORIGINAL_PROMPT_LENGTH).toBe(10_000);
    });
  });

  describe('isValidOriginalPromptLength', () => {
    /**
     * Unit Tests - Specific Examples
     */
    describe('Unit Tests', () => {
      it('should return true for empty string', () => {
        expect(isValidOriginalPromptLength('')).toBe(true);
      });

      it('should return true for single character', () => {
        expect(isValidOriginalPromptLength('a')).toBe(true);
      });

      it('should return true for typical prompt length', () => {
        const prompt = 'Create a modern website for a coffee shop with a hero section and contact form.';
        expect(isValidOriginalPromptLength(prompt)).toBe(true);
      });

      it('should return true for exactly 10,000 characters', () => {
        const prompt = 'a'.repeat(10_000);
        expect(isValidOriginalPromptLength(prompt)).toBe(true);
      });

      it('should return false for 10,001 characters', () => {
        const prompt = 'a'.repeat(10_001);
        expect(isValidOriginalPromptLength(prompt)).toBe(false);
      });

      it('should return false for much longer strings', () => {
        const prompt = 'a'.repeat(15_000);
        expect(isValidOriginalPromptLength(prompt)).toBe(false);
      });

      it('should return false for null input', () => {
        expect(isValidOriginalPromptLength(null as unknown as string)).toBe(false);
      });

      it('should return false for undefined input', () => {
        expect(isValidOriginalPromptLength(undefined as unknown as string)).toBe(false);
      });

      it('should handle unicode characters correctly', () => {
        // Each emoji is typically 2 code units in JavaScript
        // 5000 emojis = 10000 characters (within limit)
        const emojiPrompt = '😀'.repeat(5_000);
        expect(emojiPrompt.length).toBe(10_000);
        expect(isValidOriginalPromptLength(emojiPrompt)).toBe(true);
      });

      it('should reject unicode strings over the limit', () => {
        const emojiPrompt = '😀'.repeat(5_001);
        expect(emojiPrompt.length).toBe(10_002);
        expect(isValidOriginalPromptLength(emojiPrompt)).toBe(false);
      });

      it('should handle multi-byte unicode characters', () => {
        // Chinese characters are typically 1 code unit each in JavaScript
        const chinesePrompt = '中'.repeat(10_000);
        expect(chinesePrompt.length).toBe(10_000);
        expect(isValidOriginalPromptLength(chinesePrompt)).toBe(true);
      });

      it('should handle whitespace-only strings', () => {
        const whitespacePrompt = ' '.repeat(10_000);
        expect(isValidOriginalPromptLength(whitespacePrompt)).toBe(true);
      });

      it('should handle newlines and special characters', () => {
        const specialPrompt = 'Line1\nLine2\tTab\r\nCarriage';
        expect(isValidOriginalPromptLength(specialPrompt)).toBe(true);
      });
    });

    /**
     * Property-Based Tests
     *
     * These tests verify universal properties across generated inputs using fast-check.
     */
    describe('Property-Based Tests', () => {
      /**
       * Feature: website-beautify, Property 2: Original Prompt Length Validation
       *
       * *For any* string with length greater than 10,000 characters,
       * the system SHALL reject it as an invalid originalPrompt.
       *
       * **Validates: Requirements 0.2**
       */
      it('any string > 10,000 characters is rejected (Property 2)', () => {
        fc.assert(
          fc.property(
            // Generate strings with length > 10,000 characters
            fc.string({ minLength: 10_001, maxLength: 20_000 }),
            (longPrompt) => {
              // Verify the generated string is indeed longer than the limit
              expect(longPrompt.length).toBeGreaterThan(MAX_ORIGINAL_PROMPT_LENGTH);

              // Property assertion: Any string > 10,000 characters MUST be rejected
              const result = isValidOriginalPromptLength(longPrompt);
              expect(result).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Feature: website-beautify, Property 2 (inverse): Original Prompt Length Validation
       *
       * *For any* string with length <= 10,000 characters,
       * the system SHALL accept it as a valid originalPrompt.
       *
       * **Validates: Requirements 0.2**
       */
      it('any string <= 10,000 characters is accepted (Property 2 inverse)', () => {
        fc.assert(
          fc.property(
            // Generate strings with length <= 10,000 characters
            fc.string({ minLength: 0, maxLength: 10_000 }),
            (validPrompt) => {
              // Verify the generated string is within the limit
              expect(validPrompt.length).toBeLessThanOrEqual(MAX_ORIGINAL_PROMPT_LENGTH);

              // Property assertion: Any string <= 10,000 characters MUST be accepted
              const result = isValidOriginalPromptLength(validPrompt);
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Boundary test: Strings at exactly the limit
       */
      it('strings at exactly 10,000 characters are accepted', () => {
        fc.assert(
          fc.property(
            // Generate strings with exactly 10,000 characters
            fc.string({ minLength: 10_000, maxLength: 10_000 }),
            (boundaryPrompt) => {
              // Verify the generated string is exactly at the limit
              expect(boundaryPrompt.length).toBe(MAX_ORIGINAL_PROMPT_LENGTH);

              // Property assertion: Strings at exactly 10,000 characters MUST be accepted
              const result = isValidOriginalPromptLength(boundaryPrompt);
              expect(result).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Unicode property test: Validation works correctly with unicode content
       * Uses fc.string with grapheme-composite unit for unicode handling
       */
      it('handles unicode strings correctly based on JavaScript string length', () => {
        fc.assert(
          fc.property(
            // Generate strings with full unicode range
            fc.string({ minLength: 0, maxLength: 5_000, unit: 'grapheme-composite' }),
            (unicodePrompt) => {
              // Property assertion: validation should be based on JS string length
              const result = isValidOriginalPromptLength(unicodePrompt);
              expect(result).toBe(unicodePrompt.length <= MAX_ORIGINAL_PROMPT_LENGTH);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Property: Validation is deterministic
       */
      it('validation result is deterministic for the same input', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 0, maxLength: 15_000 }),
            (prompt) => {
              // Call the validation function multiple times
              const result1 = isValidOriginalPromptLength(prompt);
              const result2 = isValidOriginalPromptLength(prompt);
              const result3 = isValidOriginalPromptLength(prompt);

              // Property assertion: Same input should always produce same result
              expect(result1).toBe(result2);
              expect(result2).toBe(result3);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
