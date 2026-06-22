/**
 * Beautify Stream API Route Validation Tests
 *
 * Tests for request validation in the beautify stream API route.
 * These tests verify that the API properly validates request bodies
 * according to Requirements 4.4, 4.5, 4.7, 4.8.
 *
 * Validates: Requirements 4.4, 4.5, 4.7, 4.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { BeautifyStreamRequest, ReferenceImageMimeType } from '@/types/beautify';

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
   * Property-Based Tests
   *
   * These tests verify universal properties across generated inputs using fast-check.
   */
  describe('Property-Based Tests', () => {
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
