/**
 * Tests for Beautify Error Message Mapping
 *
 * This test suite validates the error message mapping functionality
 * for beautification-related errors, ensuring proper categorization,
 * user-friendly messages, and retry guidance.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  BEAUTIFY_ERROR_CODES,
  BEAUTIFY_ERROR_MESSAGES,
  BEAUTIFY_ERROR_CATEGORIES,
  BEAUTIFY_ERROR_RETRYABLE,
  BEAUTIFY_ERROR_ACTIONS,
  createBeautifyError,
  mapErrorToBeautifyCode,
  getBeautifyError,
  getBeautifyErrorMessage,
  isBeautifyErrorRetryable,
  getBeautifyErrorCategory,
  type BeautifyErrorCode,
  type BeautifyErrorCategory,
} from './beautifyErrors';

describe('beautifyErrors', () => {
  describe('BEAUTIFY_ERROR_CODES', () => {
    it('should define all expected error codes', () => {
      expect(BEAUTIFY_ERROR_CODES.NETWORK_ERROR).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(BEAUTIFY_ERROR_CODES.TIMEOUT_ERROR).toBe('BEAUTIFY_TIMEOUT_ERROR');
      expect(BEAUTIFY_ERROR_CODES.AUTH_ERROR).toBe('BEAUTIFY_AUTH_ERROR');
      expect(BEAUTIFY_ERROR_CODES.RATE_LIMIT_ERROR).toBe('BEAUTIFY_RATE_LIMIT_ERROR');
      expect(BEAUTIFY_ERROR_CODES.PARSE_ERROR).toBe('BEAUTIFY_PARSE_ERROR');
      expect(BEAUTIFY_ERROR_CODES.VALIDATION_ERROR).toBe('BEAUTIFY_VALIDATION_ERROR');
      expect(BEAUTIFY_ERROR_CODES.MISSING_FIELDS).toBe('BEAUTIFY_MISSING_FIELDS');
      expect(BEAUTIFY_ERROR_CODES.INVALID_IMAGE_TYPE).toBe('BEAUTIFY_INVALID_IMAGE_TYPE');
      expect(BEAUTIFY_ERROR_CODES.IMAGE_TOO_LARGE).toBe('BEAUTIFY_IMAGE_TOO_LARGE');
      expect(BEAUTIFY_ERROR_CODES.AI_ERROR).toBe('BEAUTIFY_AI_ERROR');
      expect(BEAUTIFY_ERROR_CODES.CANCELLED).toBe('BEAUTIFY_CANCELLED');
      expect(BEAUTIFY_ERROR_CODES.UNKNOWN_ERROR).toBe('BEAUTIFY_UNKNOWN_ERROR');
    });
  });

  describe('BEAUTIFY_ERROR_MESSAGES', () => {
    /**
     * Validates: Requirement 10.1
     * IF the Beautify_API returns a network error, THEN THE Website_Preview_Page
     * SHALL display "Unable to connect. Please check your internet connection."
     */
    it('should return correct message for network error', () => {
      expect(BEAUTIFY_ERROR_MESSAGES.BEAUTIFY_NETWORK_ERROR).toBe(
        'Unable to connect. Please check your internet connection.'
      );
    });

    /**
     * Validates: Requirement 10.2
     * IF the Beautify_API returns a timeout error, THEN THE Website_Preview_Page
     * SHALL display "Beautification timed out. The website may be too complex. Please try again."
     */
    it('should return correct message for timeout error', () => {
      expect(BEAUTIFY_ERROR_MESSAGES.BEAUTIFY_TIMEOUT_ERROR).toBe(
        'Beautification timed out. The website may be too complex. Please try again.'
      );
    });

    /**
     * Validates: Requirement 10.3
     * IF the Beautify_API returns an authentication error, THEN THE Website_Preview_Page
     * SHALL display "Session expired. Please refresh the page and try again."
     */
    it('should return correct message for authentication error', () => {
      expect(BEAUTIFY_ERROR_MESSAGES.BEAUTIFY_AUTH_ERROR).toBe(
        'Session expired. Please refresh the page and try again.'
      );
    });

    /**
     * Validates: Requirement 10.4
     * IF the Claude API returns a rate limit error, THEN THE Website_Preview_Page
     * SHALL display "Service is busy. Please wait a moment and try again."
     */
    it('should return correct message for rate limit error', () => {
      expect(BEAUTIFY_ERROR_MESSAGES.BEAUTIFY_RATE_LIMIT_ERROR).toBe(
        'Service is busy. Please wait a moment and try again.'
      );
    });

    /**
     * Validates: Requirement 10.5
     * IF the beautification result fails to parse, THEN THE Website_Preview_Page
     * SHALL display "Failed to process beautified content. Please try again."
     */
    it('should return correct message for parse error', () => {
      expect(BEAUTIFY_ERROR_MESSAGES.BEAUTIFY_PARSE_ERROR).toBe(
        'Failed to process beautified content. Please try again.'
      );
    });

    it('should have messages for all error codes', () => {
      const errorCodes = Object.values(BEAUTIFY_ERROR_CODES);
      for (const code of errorCodes) {
        expect(BEAUTIFY_ERROR_MESSAGES[code as BeautifyErrorCode]).toBeDefined();
        expect(typeof BEAUTIFY_ERROR_MESSAGES[code as BeautifyErrorCode]).toBe('string');
      }
    });
  });

  describe('BEAUTIFY_ERROR_CATEGORIES', () => {
    it('should categorize network errors as network', () => {
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_NETWORK_ERROR).toBe('network');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_TIMEOUT_ERROR).toBe('network');
    });

    it('should categorize validation errors as validation', () => {
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_VALIDATION_ERROR).toBe('validation');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_MISSING_FIELDS).toBe('validation');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_INVALID_IMAGE_TYPE).toBe('validation');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_IMAGE_TOO_LARGE).toBe('validation');
    });

    it('should categorize AI errors as ai', () => {
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_RATE_LIMIT_ERROR).toBe('ai');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_PARSE_ERROR).toBe('ai');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_AI_ERROR).toBe('ai');
    });

    it('should categorize general errors as general', () => {
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_AUTH_ERROR).toBe('general');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_CANCELLED).toBe('general');
      expect(BEAUTIFY_ERROR_CATEGORIES.BEAUTIFY_UNKNOWN_ERROR).toBe('general');
    });
  });

  describe('BEAUTIFY_ERROR_RETRYABLE', () => {
    it('should mark network and timeout errors as retryable', () => {
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_NETWORK_ERROR).toBe(true);
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_TIMEOUT_ERROR).toBe(true);
    });

    it('should mark rate limit and parse errors as retryable', () => {
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_RATE_LIMIT_ERROR).toBe(true);
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_PARSE_ERROR).toBe(true);
    });

    it('should mark auth errors as not retryable (requires refresh)', () => {
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_AUTH_ERROR).toBe(false);
    });

    it('should mark validation errors as not retryable (requires input correction)', () => {
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_VALIDATION_ERROR).toBe(false);
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_MISSING_FIELDS).toBe(false);
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_INVALID_IMAGE_TYPE).toBe(false);
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_IMAGE_TOO_LARGE).toBe(false);
    });

    it('should mark cancelled as not retryable (user initiated)', () => {
      expect(BEAUTIFY_ERROR_RETRYABLE.BEAUTIFY_CANCELLED).toBe(false);
    });
  });

  describe('BEAUTIFY_ERROR_ACTIONS', () => {
    it('should provide suggested actions for all error codes', () => {
      const errorCodes = Object.values(BEAUTIFY_ERROR_CODES);
      for (const code of errorCodes) {
        expect(BEAUTIFY_ERROR_ACTIONS[code as BeautifyErrorCode]).toBeDefined();
        expect(typeof BEAUTIFY_ERROR_ACTIONS[code as BeautifyErrorCode]).toBe('string');
        expect(BEAUTIFY_ERROR_ACTIONS[code as BeautifyErrorCode].length).toBeGreaterThan(0);
      }
    });
  });

  describe('createBeautifyError', () => {
    it('should create error with default message', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR');

      expect(error.code).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(error.category).toBe('network');
      expect(error.message).toBe('Unable to connect. Please check your internet connection.');
      expect(error.isRetryable).toBe(true);
      expect(error.suggestedAction).toBe('Check your internet connection and try again.');
    });

    it('should create error with custom message', () => {
      const error = createBeautifyError('BEAUTIFY_NETWORK_ERROR', 'Custom network error');

      expect(error.message).toBe('Custom network error');
    });

    it('should include details when provided', () => {
      const error = createBeautifyError('BEAUTIFY_AI_ERROR', undefined, 'Claude API returned 500');

      expect(error.details).toBe('Claude API returned 500');
    });

    it('should include retryAfter when provided', () => {
      const error = createBeautifyError('BEAUTIFY_RATE_LIMIT_ERROR', undefined, undefined, 30);

      expect(error.retryAfter).toBe(30);
    });
  });

  describe('mapErrorToBeautifyCode', () => {
    it('should map network-related errors', () => {
      expect(mapErrorToBeautifyCode('network error')).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(mapErrorToBeautifyCode('fetch failed')).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(mapErrorToBeautifyCode('unable to connect')).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(mapErrorToBeautifyCode(new Error('Connection refused'))).toBe('BEAUTIFY_NETWORK_ERROR');
    });

    it('should map timeout-related errors', () => {
      expect(mapErrorToBeautifyCode('timeout error')).toBe('BEAUTIFY_TIMEOUT_ERROR');
      expect(mapErrorToBeautifyCode('request timed out')).toBe('BEAUTIFY_TIMEOUT_ERROR');
      expect(mapErrorToBeautifyCode(new Error('Operation aborted'))).toBe('BEAUTIFY_TIMEOUT_ERROR');
    });

    it('should map authentication-related errors', () => {
      expect(mapErrorToBeautifyCode('auth failed')).toBe('BEAUTIFY_AUTH_ERROR');
      expect(mapErrorToBeautifyCode('session expired')).toBe('BEAUTIFY_AUTH_ERROR');
      expect(mapErrorToBeautifyCode('unauthorized')).toBe('BEAUTIFY_AUTH_ERROR');
      expect(mapErrorToBeautifyCode(new Error('401 Unauthorized'))).toBe('BEAUTIFY_AUTH_ERROR');
    });

    it('should map rate limit errors', () => {
      expect(mapErrorToBeautifyCode('rate limit exceeded')).toBe('BEAUTIFY_RATE_LIMIT_ERROR');
      expect(mapErrorToBeautifyCode('quota exceeded')).toBe('BEAUTIFY_RATE_LIMIT_ERROR');
      expect(mapErrorToBeautifyCode(new Error('429 Too Many Requests'))).toBe('BEAUTIFY_RATE_LIMIT_ERROR');
      expect(mapErrorToBeautifyCode('service is busy')).toBe('BEAUTIFY_RATE_LIMIT_ERROR');
    });

    it('should map parse errors', () => {
      expect(mapErrorToBeautifyCode('parse error')).toBe('BEAUTIFY_PARSE_ERROR');
      expect(mapErrorToBeautifyCode('failed to extract code')).toBe('BEAUTIFY_PARSE_ERROR');
      expect(mapErrorToBeautifyCode(new Error('Invalid response format'))).toBe('BEAUTIFY_PARSE_ERROR');
      expect(mapErrorToBeautifyCode('failed to process')).toBe('BEAUTIFY_PARSE_ERROR');
    });

    it('should map validation errors', () => {
      expect(mapErrorToBeautifyCode('validation error')).toBe('BEAUTIFY_VALIDATION_ERROR');
      expect(mapErrorToBeautifyCode('invalid input')).toBe('BEAUTIFY_VALIDATION_ERROR');
      expect(mapErrorToBeautifyCode('missing fields')).toBe('BEAUTIFY_VALIDATION_ERROR');
    });

    it('should map image-related errors', () => {
      expect(mapErrorToBeautifyCode('invalid image type')).toBe('BEAUTIFY_INVALID_IMAGE_TYPE');
      expect(mapErrorToBeautifyCode('unsupported mime type')).toBe('BEAUTIFY_INVALID_IMAGE_TYPE');
      expect(mapErrorToBeautifyCode('image too large')).toBe('BEAUTIFY_IMAGE_TOO_LARGE');
      expect(mapErrorToBeautifyCode('file size exceeds limit')).toBe('BEAUTIFY_IMAGE_TOO_LARGE');
    });

    it('should map cancellation errors', () => {
      expect(mapErrorToBeautifyCode('operation cancelled')).toBe('BEAUTIFY_CANCELLED');
      expect(mapErrorToBeautifyCode('aborted by user')).toBe('BEAUTIFY_CANCELLED');
    });

    it('should map AI errors', () => {
      expect(mapErrorToBeautifyCode('AI processing failed')).toBe('BEAUTIFY_AI_ERROR');
      expect(mapErrorToBeautifyCode('Claude API error')).toBe('BEAUTIFY_AI_ERROR');
      expect(mapErrorToBeautifyCode('generation failed')).toBe('BEAUTIFY_AI_ERROR');
    });

    it('should return unknown error for unrecognized messages', () => {
      expect(mapErrorToBeautifyCode('something weird happened')).toBe('BEAUTIFY_UNKNOWN_ERROR');
      expect(mapErrorToBeautifyCode(new Error('Unexpected error'))).toBe('BEAUTIFY_UNKNOWN_ERROR');
    });
  });

  describe('getBeautifyError', () => {
    it('should handle BeautifyErrorCode directly', () => {
      const error = getBeautifyError('BEAUTIFY_NETWORK_ERROR');

      expect(error.code).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(error.message).toBe('Unable to connect. Please check your internet connection.');
    });

    it('should handle Error objects', () => {
      const error = getBeautifyError(new Error('Network connection failed'));

      expect(error.code).toBe('BEAUTIFY_NETWORK_ERROR');
      expect(error.details).toBe('Network connection failed');
    });

    it('should handle string errors', () => {
      const error = getBeautifyError('Session expired');

      expect(error.code).toBe('BEAUTIFY_AUTH_ERROR');
    });

    it('should include custom details', () => {
      const error = getBeautifyError('BEAUTIFY_AI_ERROR', 'API returned invalid JSON');

      expect(error.details).toBe('API returned invalid JSON');
    });
  });

  describe('getBeautifyErrorMessage', () => {
    it('should return the correct message for each code', () => {
      expect(getBeautifyErrorMessage('BEAUTIFY_NETWORK_ERROR')).toBe(
        'Unable to connect. Please check your internet connection.'
      );
      expect(getBeautifyErrorMessage('BEAUTIFY_TIMEOUT_ERROR')).toBe(
        'Beautification timed out. The website may be too complex. Please try again.'
      );
      expect(getBeautifyErrorMessage('BEAUTIFY_AUTH_ERROR')).toBe(
        'Session expired. Please refresh the page and try again.'
      );
    });
  });

  describe('isBeautifyErrorRetryable', () => {
    it('should return true for retryable errors', () => {
      expect(isBeautifyErrorRetryable('BEAUTIFY_NETWORK_ERROR')).toBe(true);
      expect(isBeautifyErrorRetryable('BEAUTIFY_TIMEOUT_ERROR')).toBe(true);
      expect(isBeautifyErrorRetryable('BEAUTIFY_RATE_LIMIT_ERROR')).toBe(true);
      expect(isBeautifyErrorRetryable('BEAUTIFY_PARSE_ERROR')).toBe(true);
      expect(isBeautifyErrorRetryable('BEAUTIFY_AI_ERROR')).toBe(true);
      expect(isBeautifyErrorRetryable('BEAUTIFY_UNKNOWN_ERROR')).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isBeautifyErrorRetryable('BEAUTIFY_AUTH_ERROR')).toBe(false);
      expect(isBeautifyErrorRetryable('BEAUTIFY_VALIDATION_ERROR')).toBe(false);
      expect(isBeautifyErrorRetryable('BEAUTIFY_MISSING_FIELDS')).toBe(false);
      expect(isBeautifyErrorRetryable('BEAUTIFY_INVALID_IMAGE_TYPE')).toBe(false);
      expect(isBeautifyErrorRetryable('BEAUTIFY_IMAGE_TOO_LARGE')).toBe(false);
      expect(isBeautifyErrorRetryable('BEAUTIFY_CANCELLED')).toBe(false);
    });
  });

  describe('getBeautifyErrorCategory', () => {
    it('should return correct category for each error code', () => {
      expect(getBeautifyErrorCategory('BEAUTIFY_NETWORK_ERROR')).toBe('network');
      expect(getBeautifyErrorCategory('BEAUTIFY_VALIDATION_ERROR')).toBe('validation');
      expect(getBeautifyErrorCategory('BEAUTIFY_RATE_LIMIT_ERROR')).toBe('ai');
      expect(getBeautifyErrorCategory('BEAUTIFY_AUTH_ERROR')).toBe('general');
    });
  });

  /**
   * Property-Based Tests for Error Message Mapping (Property 19)
   *
   * **Validates: Requirements 10.1, 10.2, 10.3**
   *
   * Property 19: Every error code should map to a non-empty user-friendly message
   *
   * These tests use fast-check to verify that error message mapping is:
   * 1. Complete: Every error code maps to a non-empty message
   * 2. Consistent: Error mapping is deterministic
   * 3. Valid: All categories are from the defined set
   */
  describe('Property-Based Tests - Error Message Mapping (Property 19)', () => {
    // Get all error codes as an array for use in arbitraries
    const ALL_ERROR_CODES = Object.values(BEAUTIFY_ERROR_CODES) as BeautifyErrorCode[];
    const VALID_CATEGORIES: BeautifyErrorCategory[] = ['validation', 'network', 'ai', 'general'];

    /**
     * Property 19.1: Every error code maps to a non-empty user-friendly message
     *
     * For any error code in the system, the corresponding message must be:
     * - A non-empty string
     * - Non-whitespace only
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('every error code should map to a non-empty user-friendly message (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code from the set
          fc.constantFrom(...ALL_ERROR_CODES),
          (errorCode) => {
            const message = getBeautifyErrorMessage(errorCode);

            // Property: Message must be a non-empty string
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
            expect(message.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.2: Error mapping is consistent and deterministic
     *
     * For any error code, calling getBeautifyErrorMessage multiple times
     * should always return the exact same message.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('error mapping should be consistent and deterministic (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code
          fc.constantFrom(...ALL_ERROR_CODES),
          // Generate a number of calls to make (2-10)
          fc.integer({ min: 2, max: 10 }),
          (errorCode, numCalls) => {
            const firstMessage = getBeautifyErrorMessage(errorCode);

            // Property: Subsequent calls should return the exact same message
            for (let i = 0; i < numCalls; i++) {
              expect(getBeautifyErrorMessage(errorCode)).toBe(firstMessage);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.3: All error categories are valid
     *
     * For any error code, the category must be one of the defined categories.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('all error categories should be valid (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code
          fc.constantFrom(...ALL_ERROR_CODES),
          (errorCode) => {
            const category = getBeautifyErrorCategory(errorCode);

            // Property: Category must be one of the valid categories
            expect(VALID_CATEGORIES).toContain(category);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.4: createBeautifyError produces complete error objects
     *
     * For any error code, creating a BeautifyError should produce an object
     * with all required fields properly populated.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('createBeautifyError should produce complete error objects (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code
          fc.constantFrom(...ALL_ERROR_CODES),
          (errorCode) => {
            const error = createBeautifyError(errorCode);

            // Property: Error object must have all required fields
            expect(error.code).toBe(errorCode);
            expect(typeof error.category).toBe('string');
            expect(VALID_CATEGORIES).toContain(error.category);
            expect(typeof error.message).toBe('string');
            expect(error.message.length).toBeGreaterThan(0);
            expect(typeof error.isRetryable).toBe('boolean');
            expect(typeof error.suggestedAction).toBe('string');
            expect(error.suggestedAction!.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.5: getBeautifyError produces valid errors for any error code
     *
     * For any error code passed directly to getBeautifyError, it should
     * produce a valid BeautifyError object.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('getBeautifyError should produce valid errors for any error code (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code
          fc.constantFrom(...ALL_ERROR_CODES),
          // Optional details string
          fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
          (errorCode, details) => {
            const error = getBeautifyError(errorCode, details);

            // Property: Error object must be valid and consistent
            expect(error.code).toBe(errorCode);
            expect(error.message).toBe(BEAUTIFY_ERROR_MESSAGES[errorCode]);
            expect(error.category).toBe(BEAUTIFY_ERROR_CATEGORIES[errorCode]);
            expect(error.isRetryable).toBe(BEAUTIFY_ERROR_RETRYABLE[errorCode]);

            // If details were provided, they should be included
            if (details !== undefined) {
              expect(error.details).toBe(details);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.6: Required error types have specific messages
     *
     * Network, timeout, and authentication errors must have their
     * specific user-friendly messages as per requirements.
     *
     * **Validates: Requirements 10.1 (network), 10.2 (timeout), 10.3 (auth)**
     */
    it('required error types should have specific user-friendly messages (Property 19)', () => {
      // Define the required error type to message mappings
      const requiredMappings: Array<[BeautifyErrorCode, string]> = [
        ['BEAUTIFY_NETWORK_ERROR', 'Unable to connect. Please check your internet connection.'],
        ['BEAUTIFY_TIMEOUT_ERROR', 'Beautification timed out. The website may be too complex. Please try again.'],
        ['BEAUTIFY_AUTH_ERROR', 'Session expired. Please refresh the page and try again.'],
      ];

      fc.assert(
        fc.property(
          // Generate one of the required error type mappings
          fc.constantFrom(...requiredMappings),
          ([errorCode, expectedMessage]) => {
            const message = getBeautifyErrorMessage(errorCode);

            // Property: Each required error type must have its exact message
            expect(message).toBe(expectedMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.7: Retryable status is boolean for all error codes
     *
     * For any error code, the retryable status must be a boolean value.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('retryable status should be boolean for all error codes (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code
          fc.constantFrom(...ALL_ERROR_CODES),
          (errorCode) => {
            const isRetryable = isBeautifyErrorRetryable(errorCode);

            // Property: Must be a boolean
            expect(typeof isRetryable).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.8: All error codes have defined actions
     *
     * For any error code, there must be a non-empty suggested action.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('all error codes should have defined suggested actions (Property 19)', () => {
      fc.assert(
        fc.property(
          // Generate any valid error code
          fc.constantFrom(...ALL_ERROR_CODES),
          (errorCode) => {
            const action = BEAUTIFY_ERROR_ACTIONS[errorCode];

            // Property: Action must be a non-empty string
            expect(typeof action).toBe('string');
            expect(action.length).toBeGreaterThan(0);
            expect(action.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 19.9: Error message mapping completeness
     *
     * The set of error codes with messages must exactly match
     * the set of defined error codes.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('error message mapping should be complete (Property 19)', () => {
      fc.assert(
        fc.property(
          // Use a constant to run a single verification
          fc.constant(null),
          () => {
            const definedCodes = new Set(ALL_ERROR_CODES);
            const messagesKeys = new Set(Object.keys(BEAUTIFY_ERROR_MESSAGES));
            const categoriesKeys = new Set(Object.keys(BEAUTIFY_ERROR_CATEGORIES));
            const retryableKeys = new Set(Object.keys(BEAUTIFY_ERROR_RETRYABLE));
            const actionsKeys = new Set(Object.keys(BEAUTIFY_ERROR_ACTIONS));

            // Property: All mappings must cover exactly the same set of error codes
            expect(messagesKeys.size).toBe(definedCodes.size);
            expect(categoriesKeys.size).toBe(definedCodes.size);
            expect(retryableKeys.size).toBe(definedCodes.size);
            expect(actionsKeys.size).toBe(definedCodes.size);

            // Verify each defined code exists in all mappings
            for (const code of definedCodes) {
              expect(messagesKeys.has(code)).toBe(true);
              expect(categoriesKeys.has(code)).toBe(true);
              expect(retryableKeys.has(code)).toBe(true);
              expect(actionsKeys.has(code)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
