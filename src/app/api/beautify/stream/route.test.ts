/**
 * Beautify Stream API Route Validation Tests
 *
 * Tests for request validation in the beautify stream API route.
 * These tests verify that the API properly validates request bodies
 * according to Requirements 4.2, 4.3, 4.4, 4.5, 4.7, 4.8.
 *
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.7, 4.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { BeautifyStreamRequest, ReferenceImageMimeType, BeautifyStreamEvent } from '@/types/beautify';

/**
 * Result of authentication header validation
 */
interface AuthValidationResult {
  /** Whether the authorization header is valid format */
  isValidFormat: boolean;
  /** The extracted token if valid, null otherwise */
  token: string | null;
  /** Error message if invalid */
  error?: string;
}

/**
 * Validates the Authorization header format for Bearer token authentication.
 * This mirrors the logic in verifyAuthToken from route.ts.
 * Validates: Requirements 4.2, 4.3
 *
 * @param authHeader - The Authorization header value (or null/undefined)
 * @returns AuthValidationResult with validation status
 */
function validateAuthHeader(authHeader: string | null | undefined): AuthValidationResult {
  // No authorization header provided
  if (!authHeader) {
    return {
      isValidFormat: false,
      token: null,
      error: 'Authorization header is required',
    };
  }

  // Authorization header must start with 'Bearer '
  if (!authHeader.startsWith('Bearer ')) {
    return {
      isValidFormat: false,
      token: null,
      error: 'Authorization header must use Bearer scheme',
    };
  }

  // Extract the token (everything after 'Bearer ')
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  // Token must not be empty
  if (!token || token.trim().length === 0) {
    return {
      isValidFormat: false,
      token: null,
      error: 'Bearer token is empty',
    };
  }

  return {
    isValidFormat: true,
    token,
  };
}

/**
 * Valid MIME types for reference images
 * Validates: Requirement 4.7 - Reference image MIME type validation
 */
const VALID_MIME_TYPES: ReferenceImageMimeType[] = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Validates that a string is well-formed base64.
 * Checks for valid base64 characters and proper padding.
 *
 * @param str - The string to validate
 * @returns true if the string is valid base64, false otherwise
 */
function isValidBase64(str: string): boolean {
  // Empty string is not valid base64 for an image
  if (!str || str.length === 0) {
    return false;
  }

  // Base64 regex: only valid base64 characters with optional padding
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  // Check if string contains only valid base64 characters
  if (!base64Regex.test(str)) {
    return false;
  }

  // Base64 string length must be a multiple of 4 (with padding)
  if (str.length % 4 !== 0) {
    return false;
  }

  // Try to decode to verify it's valid
  try {
    if (typeof atob === 'function') {
      atob(str);
    } else {
      Buffer.from(str, 'base64');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates the request body for beautification.
 * This is a copy of the validation function from route.ts for testing purposes.
 * Validates: Requirements 4.4, 4.5, 4.7, 4.8
 *
 * @param body - The request body to validate
 * @returns Object with valid flag and optional error message
 */
function validateRequest(body: unknown): { valid: true; data: BeautifyStreamRequest } | { valid: false; error: string } {
  // Check if body is an object
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const request = body as Record<string, unknown>;

  // Validate required field: websiteId
  if (!request.websiteId || typeof request.websiteId !== 'string') {
    return { valid: false, error: 'websiteId is required and must be a string' };
  }

  // Validate required field: html
  if (!request.html || typeof request.html !== 'string') {
    return { valid: false, error: 'html is required and must be a string' };
  }

  // Validate required field: css
  if (!request.css || typeof request.css !== 'string') {
    return { valid: false, error: 'css is required and must be a string' };
  }

  // Validate optional field: originalPrompt
  if (request.originalPrompt !== undefined && typeof request.originalPrompt !== 'string') {
    return { valid: false, error: 'originalPrompt must be a string if provided' };
  }

  // Validate reference image fields together
  // Validates: Requirements 4.7, 4.8
  if (request.referenceImage !== undefined) {
    if (typeof request.referenceImage !== 'string') {
      return { valid: false, error: 'referenceImage must be a base64 encoded string' };
    }

    // Validate base64 format
    if (!isValidBase64(request.referenceImage)) {
      return { valid: false, error: 'referenceImage must be a valid base64 encoded string' };
    }

    // If referenceImage is provided, referenceImageMimeType must also be provided
    if (!request.referenceImageMimeType) {
      return { valid: false, error: 'referenceImageMimeType is required when referenceImage is provided' };
    }

    if (typeof request.referenceImageMimeType !== 'string') {
      return { valid: false, error: 'referenceImageMimeType must be a string' };
    }

    // Validate MIME type
    if (!VALID_MIME_TYPES.includes(request.referenceImageMimeType as ReferenceImageMimeType)) {
      return {
        valid: false,
        error: `Invalid referenceImageMimeType. Supported types: ${VALID_MIME_TYPES.join(', ')}`,
      };
    }
  }

  return {
    valid: true,
    data: {
      websiteId: request.websiteId as string,
      html: request.html as string,
      css: request.css as string,
      originalPrompt: request.originalPrompt as string | undefined,
      referenceImage: request.referenceImage as string | undefined,
      referenceImageMimeType: request.referenceImageMimeType as ReferenceImageMimeType | undefined,
    },
  };
}

describe('Beautify API Route Validation', () => {
  describe('validateRequest', () => {
    /**
     * Validates: Requirement 4.4 - THE Beautify_API SHALL accept a JSON body with:
     * `websiteId` (string, required), `html` (string, required), `css` (string, required)
     */
    describe('Required Fields Validation', () => {
      it('should reject null body', () => {
        const result = validateRequest(null);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('Request body must be a JSON object');
        }
      });

      it('should reject undefined body', () => {
        const result = validateRequest(undefined);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('Request body must be a JSON object');
        }
      });

      it('should reject non-object body (string)', () => {
        const result = validateRequest('not an object');
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('Request body must be a JSON object');
        }
      });

      it('should reject non-object body (number)', () => {
        const result = validateRequest(123);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('Request body must be a JSON object');
        }
      });

      it('should reject non-object body (array)', () => {
        // Arrays are technically objects in JavaScript, so they pass the object check
        // but fail validation because they don't have the required fields
        const result = validateRequest([]);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('websiteId is required and must be a string');
        }
      });

      it('should reject empty object (missing all required fields)', () => {
        const result = validateRequest({});
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('websiteId is required and must be a string');
        }
      });

      it('should reject missing websiteId', () => {
        const result = validateRequest({ html: '<html></html>', css: 'body {}' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('websiteId is required and must be a string');
        }
      });

      it('should reject non-string websiteId', () => {
        const result = validateRequest({ websiteId: 123, html: '<html></html>', css: 'body {}' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('websiteId is required and must be a string');
        }
      });

      it('should reject empty string websiteId', () => {
        const result = validateRequest({ websiteId: '', html: '<html></html>', css: 'body {}' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('websiteId is required and must be a string');
        }
      });

      it('should reject missing html', () => {
        const result = validateRequest({ websiteId: 'test-id', css: 'body {}' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('html is required and must be a string');
        }
      });

      it('should reject non-string html', () => {
        const result = validateRequest({ websiteId: 'test-id', html: 123, css: 'body {}' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('html is required and must be a string');
        }
      });

      it('should reject empty string html', () => {
        const result = validateRequest({ websiteId: 'test-id', html: '', css: 'body {}' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('html is required and must be a string');
        }
      });

      it('should reject missing css', () => {
        const result = validateRequest({ websiteId: 'test-id', html: '<html></html>' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('css is required and must be a string');
        }
      });

      it('should reject non-string css', () => {
        const result = validateRequest({ websiteId: 'test-id', html: '<html></html>', css: 123 });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('css is required and must be a string');
        }
      });

      it('should reject empty string css', () => {
        const result = validateRequest({ websiteId: 'test-id', html: '<html></html>', css: '' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('css is required and must be a string');
        }
      });

      it('should accept valid request with all required fields', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body { margin: 0; }',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.websiteId).toBe('test-id');
          expect(result.data.html).toBe('<html></html>');
          expect(result.data.css).toBe('body { margin: 0; }');
        }
      });
    });

    /**
     * Validates: Requirement 4.4 - originalPrompt (string, optional)
     */
    describe('Optional originalPrompt Validation', () => {
      it('should accept request without originalPrompt', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.originalPrompt).toBeUndefined();
        }
      });

      it('should accept request with valid originalPrompt string', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          originalPrompt: 'Create a landing page',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.originalPrompt).toBe('Create a landing page');
        }
      });

      it('should reject non-string originalPrompt', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          originalPrompt: 123,
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('originalPrompt must be a string if provided');
        }
      });

      it('should reject object originalPrompt', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          originalPrompt: { text: 'something' },
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('originalPrompt must be a string if provided');
        }
      });

      it('should reject array originalPrompt', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          originalPrompt: ['prompt1', 'prompt2'],
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('originalPrompt must be a string if provided');
        }
      });
    });

    /**
     * Validates: Requirements 4.7, 4.8 - Reference image validation
     * IF `referenceImage` is provided, THE Beautify_API SHALL validate the mime type is one of: image/png, image/jpeg, image/webp
     * IF `referenceImage` validation fails, THEN THE Beautify_API SHALL return a 400 status
     */
    describe('Reference Image Validation', () => {
      // Valid base64 string for testing (represents a minimal valid base64)
      const validBase64 = 'aGVsbG8gd29ybGQ='; // "hello world" in base64

      it('should accept request without referenceImage', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.referenceImage).toBeUndefined();
          expect(result.data.referenceImageMimeType).toBeUndefined();
        }
      });

      it('should reject non-string referenceImage', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: 123,
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('referenceImage must be a base64 encoded string');
        }
      });

      it('should reject invalid base64 referenceImage', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: 'not-valid-base64!!!',
          referenceImageMimeType: 'image/png',
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('referenceImage must be a valid base64 encoded string');
        }
      });

      it('should reject referenceImage without referenceImageMimeType', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('referenceImageMimeType is required when referenceImage is provided');
        }
      });

      it('should reject non-string referenceImageMimeType', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
          referenceImageMimeType: 123,
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('referenceImageMimeType must be a string');
        }
      });

      it('should reject invalid referenceImageMimeType', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
          referenceImageMimeType: 'image/gif',
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toBe('Invalid referenceImageMimeType. Supported types: image/png, image/jpeg, image/webp');
        }
      });

      it('should reject text/plain MIME type', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
          referenceImageMimeType: 'text/plain',
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.error).toContain('Invalid referenceImageMimeType');
        }
      });

      it('should accept image/png MIME type', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
          referenceImageMimeType: 'image/png',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.referenceImageMimeType).toBe('image/png');
        }
      });

      it('should accept image/jpeg MIME type', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
          referenceImageMimeType: 'image/jpeg',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.referenceImageMimeType).toBe('image/jpeg');
        }
      });

      it('should accept image/webp MIME type', () => {
        const result = validateRequest({
          websiteId: 'test-id',
          html: '<html></html>',
          css: 'body {}',
          referenceImage: validBase64,
          referenceImageMimeType: 'image/webp',
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.referenceImageMimeType).toBe('image/webp');
        }
      });
    });

    /**
     * Validates: Full valid request acceptance
     */
    describe('Valid Request Acceptance', () => {
      const validBase64 = 'aGVsbG8gd29ybGQ=';

      it('should accept complete valid request with all fields', () => {
        const result = validateRequest({
          websiteId: 'website-123',
          html: '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>',
          css: 'body { font-family: Arial; } h1 { color: blue; }',
          originalPrompt: 'Create a simple landing page with a welcome message',
          referenceImage: validBase64,
          referenceImageMimeType: 'image/png',
        });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.websiteId).toBe('website-123');
          expect(result.data.html).toContain('Hello');
          expect(result.data.css).toContain('font-family');
          expect(result.data.originalPrompt).toContain('landing page');
          expect(result.data.referenceImage).toBe(validBase64);
          expect(result.data.referenceImageMimeType).toBe('image/png');
        }
      });

      it('should accept minimal valid request with only required fields', () => {
        const result = validateRequest({
          websiteId: 'id',
          html: '<html></html>',
          css: 'body{}',
        });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data.websiteId).toBe('id');
          expect(result.data.html).toBe('<html></html>');
          expect(result.data.css).toBe('body{}');
          expect(result.data.originalPrompt).toBeUndefined();
          expect(result.data.referenceImage).toBeUndefined();
          expect(result.data.referenceImageMimeType).toBeUndefined();
        }
      });
    });
  });

  /**
   * Authentication Header Validation Tests
   *
   * Validates: Requirements 4.2, 4.3
   * - THE Beautify_API SHALL require Firebase authentication via Bearer token in the Authorization header
   * - IF authentication fails, THEN THE Beautify_API SHALL return a 401 status with an error event
   */
  describe('Authentication Header Validation', () => {
    describe('validateAuthHeader', () => {
      it('should reject null authorization header', () => {
        const result = validateAuthHeader(null);
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Authorization header is required');
      });

      it('should reject undefined authorization header', () => {
        const result = validateAuthHeader(undefined);
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Authorization header is required');
      });

      it('should reject empty string authorization header', () => {
        const result = validateAuthHeader('');
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Authorization header is required');
      });

      it('should reject authorization header without Bearer prefix', () => {
        const result = validateAuthHeader('some-token-value');
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Authorization header must use Bearer scheme');
      });

      it('should reject authorization header with Basic auth scheme', () => {
        const result = validateAuthHeader('Basic dXNlcjpwYXNz');
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Authorization header must use Bearer scheme');
      });

      it('should reject authorization header with lowercase bearer', () => {
        const result = validateAuthHeader('bearer some-token');
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Authorization header must use Bearer scheme');
      });

      it('should reject Bearer with empty token', () => {
        const result = validateAuthHeader('Bearer ');
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Bearer token is empty');
      });

      it('should reject Bearer with whitespace-only token', () => {
        const result = validateAuthHeader('Bearer    ');
        expect(result.isValidFormat).toBe(false);
        expect(result.token).toBeNull();
        expect(result.error).toBe('Bearer token is empty');
      });

      it('should accept valid Bearer token', () => {
        const result = validateAuthHeader('Bearer valid-firebase-token');
        expect(result.isValidFormat).toBe(true);
        expect(result.token).toBe('valid-firebase-token');
        expect(result.error).toBeUndefined();
      });

      it('should extract correct token value', () => {
        const result = validateAuthHeader('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test');
        expect(result.isValidFormat).toBe(true);
        expect(result.token).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test');
      });
    });
  });

  /**
   * Property-Based Tests
   *
   * These tests verify universal properties across generated inputs using fast-check.
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: website-beautify, Property 9: Authentication Required for API Access
     *
     * *For any* request to `/api/beautify/stream` without a valid authentication token,
     * the API SHALL return a 401 status.
     *
     * This property tests the Authorization header validation logic.
     * Note: The actual Firebase token verification is handled by Firebase Admin SDK
     * which is an external system. These tests verify the header format validation
     * that occurs before token verification.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('requests without Authorization header should fail authentication (Property 9)', () => {
      fc.assert(
        fc.property(
          // Generate various falsy or missing header values
          fc.constantFrom(null, undefined, ''),
          (authHeader) => {
            const result = validateAuthHeader(authHeader);

            // Should fail authentication
            expect(result.isValidFormat).toBe(false);
            expect(result.token).toBeNull();
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 9 (continued): Invalid Bearer token format
     *
     * *For any* request with an Authorization header that doesn't use 'Bearer ' prefix,
     * the authentication validation should fail.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('requests with non-Bearer Authorization scheme should fail authentication (Property 9)', () => {
      // Generate random strings that don't start with 'Bearer '
      const nonBearerSchemes = [
        'Basic',
        'Digest',
        'bearer', // lowercase
        'BEARER',
        'Token',
        'ApiKey',
        'JWT',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...nonBearerSchemes),
          fc.string({ minLength: 1, maxLength: 100 }),
          (scheme, token) => {
            const authHeader = `${scheme} ${token}`;
            const result = validateAuthHeader(authHeader);

            // Should fail authentication (doesn't start with 'Bearer ')
            expect(result.isValidFormat).toBe(false);
            expect(result.token).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 9 (continued): Invalid token values
     *
     * *For any* request with 'Bearer ' prefix but invalid/empty token,
     * the authentication validation should fail.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('requests with empty Bearer token should fail authentication (Property 9)', () => {
      // Whitespace-only strings
      const whitespaceStrings = ['', ' ', '  ', '\t', '\n', '\r', '   ', '\t\t', ' \t \n '];

      fc.assert(
        fc.property(
          fc.constantFrom(...whitespaceStrings),
          (whitespace) => {
            const authHeader = `Bearer ${whitespace}`;
            const result = validateAuthHeader(authHeader);

            // Should fail - empty or whitespace-only tokens are invalid
            expect(result.isValidFormat).toBe(false);
            expect(result.token).toBeNull();
            expect(result.error).toBe('Bearer token is empty');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 9 (continued): Malformed Authorization headers
     *
     * *For any* random string that doesn't follow 'Bearer <token>' format,
     * the authentication validation should fail.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('requests with malformed Authorization header should fail authentication (Property 9)', () => {
      fc.assert(
        fc.property(
          // Generate random strings that don't start with 'Bearer '
          fc.string({ minLength: 1, maxLength: 200 }).filter((s) => !s.startsWith('Bearer ')),
          (authHeader) => {
            const result = validateAuthHeader(authHeader);

            // Should fail - doesn't follow Bearer token format
            expect(result.isValidFormat).toBe(false);
            expect(result.token).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 9 (continued): Valid Bearer token format acceptance
     *
     * *For any* request with a properly formatted 'Bearer <token>' Authorization header
     * where the token is non-empty, the header format validation should pass.
     * (Note: Actual token verification by Firebase Admin SDK is a separate concern)
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('requests with valid Bearer token format should pass header validation (Property 9)', () => {
      fc.assert(
        fc.property(
          // Generate non-empty token strings (typical JWT-like patterns)
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
          (token) => {
            const authHeader = `Bearer ${token}`;
            const result = validateAuthHeader(authHeader);

            // Should pass header format validation
            expect(result.isValidFormat).toBe(true);
            expect(result.token).toBe(token);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 10: Required Fields Validation
     *
     * *For any* request to `/api/beautify/stream` missing websiteId, html, or css fields,
     * the API SHALL return a 400 status with a validation error.
     *
     * **Validates: Requirements 4.4, 4.5**
     */
    it('missing required fields should fail validation (Property 10)', () => {
      fc.assert(
        fc.property(
          // Generate optional values for each field
          fc.record({
            websiteId: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            html: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
            css: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          }),
          (request) => {
            // If ANY required field is missing, validation should fail
            const hasWebsiteId = request.websiteId !== undefined && request.websiteId !== '';
            const hasHtml = request.html !== undefined && request.html !== '';
            const hasCss = request.css !== undefined && request.css !== '';

            const result = validateRequest(request);

            if (!hasWebsiteId || !hasHtml || !hasCss) {
              // Should be invalid
              expect(result.valid).toBe(false);
              if (!result.valid) {
                expect(result.error.length).toBeGreaterThan(0);
              }
            } else {
              // All required fields present - should be valid
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 11: Reference Image MIME Type Validation
     *
     * *For any* request with a referenceImage that has a MIME type other than
     * image/png, image/jpeg, or image/webp, the API SHALL return a 400 status.
     *
     * **Validates: Requirements 4.7, 4.8**
     */
    it('invalid MIME types should fail validation (Property 11)', () => {
      const validBase64 = 'aGVsbG8gd29ybGQ=';
      // Invalid MIME types that are actually provided (non-empty)
      const invalidMimeTypes = [
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'text/plain',
        'application/json',
        'video/mp4',
        'audio/mp3',
        'invalid',
        'image',
        'png',
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...invalidMimeTypes),
          (mimeType) => {
            const result = validateRequest({
              websiteId: 'test-id',
              html: '<html></html>',
              css: 'body {}',
              referenceImage: validBase64,
              referenceImageMimeType: mimeType,
            });

            // Invalid MIME types should fail validation
            expect(result.valid).toBe(false);
            if (!result.valid) {
              expect(result.error).toContain('Invalid referenceImageMimeType');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 11 (continued): Valid MIME types acceptance
     *
     * *For any* request with a referenceImage that has a valid MIME type
     * (image/png, image/jpeg, or image/webp), the validation should pass.
     *
     * **Validates: Requirements 4.7, 4.8**
     */
    it('valid MIME types should pass validation (Property 11)', () => {
      const validBase64 = 'aGVsbG8gd29ybGQ=';

      fc.assert(
        fc.property(
          fc.constantFrom('image/png', 'image/jpeg', 'image/webp'),
          fc.string({ minLength: 1, maxLength: 50 }), // websiteId
          fc.string({ minLength: 1, maxLength: 100 }), // html
          fc.string({ minLength: 1, maxLength: 100 }), // css
          (mimeType, websiteId, html, css) => {
            const result = validateRequest({
              websiteId,
              html,
              css,
              referenceImage: validBase64,
              referenceImageMimeType: mimeType,
            });

            // Valid MIME types should pass validation
            expect(result.valid).toBe(true);
            if (result.valid) {
              expect(result.data.referenceImageMimeType).toBe(mimeType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 10 (continued): Valid requests acceptance
     *
     * *For any* request with all required string fields present (non-empty),
     * the validation should pass for the required fields check.
     *
     * **Validates: Requirements 4.4, 4.5**
     */
    it('requests with all required fields should pass validation (Property 10)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // websiteId
          fc.string({ minLength: 1, maxLength: 500 }), // html
          fc.string({ minLength: 1, maxLength: 200 }), // css
          (websiteId, html, css) => {
            const result = validateRequest({
              websiteId,
              html,
              css,
            });

            // All required fields present and non-empty - should be valid
            expect(result.valid).toBe(true);
            if (result.valid) {
              expect(result.data.websiteId).toBe(websiteId);
              expect(result.data.html).toBe(html);
              expect(result.data.css).toBe(css);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * SSE Response Format Tests
 *
 * Tests for Server-Sent Events (SSE) response format in the beautify stream API route.
 * These tests verify that SSE events are formatted correctly according to the SSE specification
 * and that event JSON conforms to the BeautifyStreamEvent type.
 *
 * Validates: Requirements 4.9
 */
describe('SSE Response Format', () => {
  /**
   * Valid BeautifyEventType values
   */
  const VALID_EVENT_TYPES: BeautifyStreamEvent['type'][] = ['start', 'mode', 'text', 'done', 'error'];

  /**
   * Valid BeautificationMode values
   */
  const VALID_MODES: ('complete' | 'enhance')[] = ['complete', 'enhance'];

  /**
   * Formats a BeautifyStreamEvent as an SSE message.
   * This is a copy of the formatSSEMessage function from route.ts for testing purposes.
   *
   * @param event - The event to format
   * @returns Formatted SSE string
   */
  function formatSSEMessage(event: BeautifyStreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
  }

  /**
   * Validates that a string is a properly formatted SSE message.
   * SSE format: `data: {JSON}\n\n`
   *
   * @param message - The message to validate
   * @returns Object with valid flag, parsed event, and any errors
   */
  function validateSSEFormat(message: string): {
    valid: boolean;
    event?: BeautifyStreamEvent;
    error?: string;
  } {
    // Check for correct prefix
    if (!message.startsWith('data: ')) {
      return { valid: false, error: 'SSE message must start with "data: "' };
    }

    // Check for correct suffix (double newline)
    if (!message.endsWith('\n\n')) {
      return { valid: false, error: 'SSE message must end with "\\n\\n"' };
    }

    // Extract JSON portion
    const jsonPart = message.slice(6, -2); // Remove 'data: ' prefix and '\n\n' suffix

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonPart);
    } catch {
      return { valid: false, error: 'SSE message JSON is not valid JSON' };
    }

    // Validate it's an object
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'SSE message JSON must be an object' };
    }

    return { valid: true, event: parsed as BeautifyStreamEvent };
  }

  /**
   * Validates that an object conforms to BeautifyStreamEvent type.
   *
   * @param event - The event object to validate
   * @returns Object with valid flag and any errors
   */
  function validateBeautifyStreamEvent(event: unknown): {
    valid: boolean;
    error?: string;
  } {
    if (!event || typeof event !== 'object') {
      return { valid: false, error: 'Event must be an object' };
    }

    const e = event as Record<string, unknown>;

    // Type is required and must be a valid event type
    if (!e.type || typeof e.type !== 'string') {
      return { valid: false, error: 'Event must have a string "type" field' };
    }

    if (!VALID_EVENT_TYPES.includes(e.type as BeautifyStreamEvent['type'])) {
      return { valid: false, error: `Event type must be one of: ${VALID_EVENT_TYPES.join(', ')}` };
    }

    // Validate type-specific fields
    switch (e.type) {
      case 'text':
        // text events should have content
        if (e.content !== undefined && typeof e.content !== 'string') {
          return { valid: false, error: 'text event content must be a string' };
        }
        break;

      case 'mode':
        // mode events should have a valid mode
        if (e.mode !== undefined && !VALID_MODES.includes(e.mode as 'complete' | 'enhance')) {
          return { valid: false, error: `mode event mode must be one of: ${VALID_MODES.join(', ')}` };
        }
        // issues should be an array of strings if present
        if (e.issues !== undefined) {
          if (!Array.isArray(e.issues)) {
            return { valid: false, error: 'mode event issues must be an array' };
          }
          if (!e.issues.every((i: unknown) => typeof i === 'string')) {
            return { valid: false, error: 'mode event issues must be an array of strings' };
          }
        }
        break;

      case 'done':
        // done events may have a result with html and css
        if (e.result !== undefined) {
          if (typeof e.result !== 'object' || e.result === null) {
            return { valid: false, error: 'done event result must be an object' };
          }
          const result = e.result as Record<string, unknown>;
          if (result.html !== undefined && typeof result.html !== 'string') {
            return { valid: false, error: 'done event result.html must be a string' };
          }
          if (result.css !== undefined && typeof result.css !== 'string') {
            return { valid: false, error: 'done event result.css must be a string' };
          }
        }
        break;

      case 'error':
        // error events should have an error message
        if (e.error !== undefined && typeof e.error !== 'string') {
          return { valid: false, error: 'error event error must be a string' };
        }
        break;

      case 'start':
        // start events have no additional required fields
        break;
    }

    return { valid: true };
  }

  describe('formatSSEMessage', () => {
    it('should format events with data: prefix', () => {
      const event: BeautifyStreamEvent = { type: 'start' };
      const message = formatSSEMessage(event);
      expect(message.startsWith('data: ')).toBe(true);
    });

    it('should format events with double newline suffix', () => {
      const event: BeautifyStreamEvent = { type: 'start' };
      const message = formatSSEMessage(event);
      expect(message.endsWith('\n\n')).toBe(true);
    });

    it('should format events with valid JSON', () => {
      const event: BeautifyStreamEvent = { type: 'text', content: 'Hello' };
      const message = formatSSEMessage(event);
      const jsonPart = message.slice(6, -2);
      expect(() => JSON.parse(jsonPart)).not.toThrow();
    });

    it('should preserve event type in JSON', () => {
      const event: BeautifyStreamEvent = { type: 'mode', mode: 'enhance' };
      const message = formatSSEMessage(event);
      const jsonPart = message.slice(6, -2);
      const parsed = JSON.parse(jsonPart);
      expect(parsed.type).toBe('mode');
      expect(parsed.mode).toBe('enhance');
    });
  });

  /**
   * Property-Based Tests for SSE Response Format
   *
   * These tests verify universal properties across generated inputs using fast-check.
   */
  describe('Property-Based Tests', () => {
    /**
     * Arbitrary for generating valid BeautifyStreamEvent objects
     */
    const beautifyStreamEventArbitrary = fc.oneof(
      // start event
      fc.record({
        type: fc.constant('start' as const),
      }),
      // mode event
      fc.record({
        type: fc.constant('mode' as const),
        mode: fc.constantFrom('complete' as const, 'enhance' as const),
        issues: fc.option(fc.array(fc.string({ maxLength: 100 }), { maxLength: 5 }), { nil: undefined }),
      }),
      // text event
      fc.record({
        type: fc.constant('text' as const),
        content: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
      }),
      // done event
      fc.record({
        type: fc.constant('done' as const),
        result: fc.option(
          fc.record({
            html: fc.string({ maxLength: 500 }),
            css: fc.string({ maxLength: 200 }),
          }),
          { nil: undefined }
        ),
      }),
      // error event
      fc.record({
        type: fc.constant('error' as const),
        error: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      })
    );

    /**
     * Feature: website-beautify, Property 12: SSE Response Format
     *
     * *For any* SSE event emitted by the beautify API, the event SHALL be formatted
     * as `data: {JSON}\n\n` and the JSON SHALL conform to the BeautifyStreamEvent type.
     *
     * **Validates: Requirements 4.9**
     */
    it('SSE messages should be formatted as data: {JSON}\\n\\n (Property 12)', () => {
      fc.assert(
        fc.property(beautifyStreamEventArbitrary, (event) => {
          const message = formatSSEMessage(event as BeautifyStreamEvent);

          // Verify SSE format: data: {JSON}\n\n
          const formatValidation = validateSSEFormat(message);
          expect(formatValidation.valid).toBe(true);
          if (!formatValidation.valid) {
            throw new Error(formatValidation.error);
          }

          // Verify JSON roundtrip preserves the event
          const parsed = formatValidation.event;
          expect(parsed).toBeDefined();
          expect(parsed?.type).toBe(event.type);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 12 (continued): BeautifyStreamEvent Type Conformance
     *
     * *For any* SSE event emitted by the beautify API, the JSON SHALL conform
     * to the BeautifyStreamEvent type with valid event types.
     *
     * **Validates: Requirements 4.9**
     */
    it('SSE event JSON should conform to BeautifyStreamEvent type (Property 12)', () => {
      fc.assert(
        fc.property(beautifyStreamEventArbitrary, (event) => {
          const message = formatSSEMessage(event as BeautifyStreamEvent);

          // Parse the SSE message
          const formatValidation = validateSSEFormat(message);
          expect(formatValidation.valid).toBe(true);

          // Validate the event conforms to BeautifyStreamEvent type
          const typeValidation = validateBeautifyStreamEvent(formatValidation.event);
          expect(typeValidation.valid).toBe(true);
          if (!typeValidation.valid) {
            throw new Error(typeValidation.error);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 12 (continued): All event types produce valid SSE
     *
     * *For any* valid BeautifyEventType, the formatSSEMessage function
     * SHALL produce a correctly formatted SSE message.
     *
     * **Validates: Requirements 4.9**
     */
    it('all event types should produce valid SSE format (Property 12)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_EVENT_TYPES),
          fc.string({ maxLength: 200 }), // content/error message
          (eventType, stringContent) => {
            // Create event based on type
            let event: BeautifyStreamEvent;
            switch (eventType) {
              case 'start':
                event = { type: 'start' };
                break;
              case 'mode':
                event = { type: 'mode', mode: 'enhance' };
                break;
              case 'text':
                event = { type: 'text', content: stringContent };
                break;
              case 'done':
                event = { type: 'done', result: { html: '<html></html>', css: 'body {}' } };
                break;
              case 'error':
                event = { type: 'error', error: stringContent };
                break;
            }

            const message = formatSSEMessage(event);

            // Verify SSE format
            expect(message.startsWith('data: ')).toBe(true);
            expect(message.endsWith('\n\n')).toBe(true);

            // Verify JSON is valid
            const jsonPart = message.slice(6, -2);
            const parsed = JSON.parse(jsonPart);
            expect(parsed.type).toBe(eventType);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 12 (continued): Special characters in content
     *
     * *For any* string content including special characters (newlines, quotes, unicode),
     * the formatSSEMessage function SHALL produce valid JSON that can be parsed back.
     *
     * **Validates: Requirements 4.9**
     */
    it('SSE format should handle special characters in content (Property 12)', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 300 }), // arbitrary strings with special chars
          (content) => {
            const event: BeautifyStreamEvent = { type: 'text', content };
            const message = formatSSEMessage(event);

            // Verify SSE format
            const formatValidation = validateSSEFormat(message);
            expect(formatValidation.valid).toBe(true);

            // Verify content is preserved after roundtrip
            if (formatValidation.event && formatValidation.event.content !== undefined) {
              expect(formatValidation.event.content).toBe(content);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 12 (continued): Error messages in SSE
     *
     * *For any* error message string, the error event SHALL be formatted
     * as a valid SSE message with the error preserved.
     *
     * **Validates: Requirements 4.9**
     */
    it('error events should preserve error message in SSE format (Property 12)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            const event: BeautifyStreamEvent = { type: 'error', error: errorMessage };
            const message = formatSSEMessage(event);

            // Verify SSE format
            const formatValidation = validateSSEFormat(message);
            expect(formatValidation.valid).toBe(true);

            // Verify error is preserved
            expect(formatValidation.event?.type).toBe('error');
            expect(formatValidation.event?.error).toBe(errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 12 (continued): Done events with result
     *
     * *For any* valid HTML and CSS strings in done events, the result
     * SHALL be preserved in the SSE message after parsing.
     *
     * **Validates: Requirements 4.9**
     */
    it('done events should preserve result html and css in SSE format (Property 12)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 300 }), // html
          fc.string({ minLength: 1, maxLength: 150 }), // css
          (html, css) => {
            const event: BeautifyStreamEvent = {
              type: 'done',
              result: { html, css },
            };
            const message = formatSSEMessage(event);

            // Verify SSE format
            const formatValidation = validateSSEFormat(message);
            expect(formatValidation.valid).toBe(true);

            // Verify result is preserved
            expect(formatValidation.event?.type).toBe('done');
            expect(formatValidation.event?.result?.html).toBe(html);
            expect(formatValidation.event?.result?.css).toBe(css);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
