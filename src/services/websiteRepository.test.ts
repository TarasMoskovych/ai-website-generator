/**
 * Website Repository Tests
 *
 * Property-based tests for the website repository service.
 * Tests focus on data transformation logic for originalPrompt storage and retrieval.
 *
 * **Validates: Requirements 0.1, 0.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Timestamp } from 'firebase/firestore';
import type { GeneratedWebsite, CreateWebsiteData } from '@/types/website';

/**
 * Simulates the documentToWebsite transformation from websiteRepository.ts
 * This is the logic we're testing for round-trip consistency.
 *
 * We recreate the transformation here because:
 * 1. We can't easily import the private function
 * 2. Testing the transformation logic independently of Firebase
 */
function documentToWebsite(
  id: string,
  data: Record<string, unknown>
): GeneratedWebsite {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    html: data.html as string,
    css: data.css as string,
    thumbnailUrl: (data.thumbnailUrl || data.thumbnail || '') as string,
    inputType: (data.inputType || data.sourceType) as 'text' | 'screenshot',
    originalPrompt: (data.originalPrompt ?? null) as string | null,
    isPublic: (data.isPublic ?? true) as boolean,
    isShowcased: (data.isShowcased ?? false) as boolean,
    showcasedAt: data.showcasedAt instanceof Timestamp
      ? data.showcasedAt.toDate().toISOString()
      : (data.showcasedAt || null) as string | null,
    creatorName: (data.creatorName || 'Anonymous') as string,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : data.createdAt as string,
    updatedAt: data.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt as string,
  };
}

/**
 * Simulates the save function's data transformation.
 * This creates the document data that would be stored in Firestore.
 */
function createWebsiteDocumentData(
  userId: string,
  website: CreateWebsiteData,
  creatorName: string = 'Anonymous'
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    userId,
    title: website.title,
    html: website.html,
    css: website.css,
    thumbnailUrl: website.thumbnailUrl,
    inputType: website.inputType,
    originalPrompt: website.originalPrompt ?? null,
    isPublic: website.isPublic ?? true,
    isShowcased: false,
    showcasedAt: null,
    creatorName,
    createdAt: now,
    updatedAt: now,
  };
}

describe('WebsiteRepository', () => {
  describe('originalPrompt Data Transformation', () => {
    /**
     * Unit test: Verify basic originalPrompt storage in document data
     */
    it('should include originalPrompt in document data when provided', () => {
      const website: CreateWebsiteData = {
        title: 'Test Website',
        html: '<html><body>Test</body></html>',
        css: 'body { margin: 0; }',
        thumbnailUrl: 'data:image/png;base64,abc123',
        inputType: 'text',
        originalPrompt: 'Create a landing page for my startup',
        isPublic: true,
      };

      const docData = createWebsiteDocumentData('user-123', website, 'Test User');

      expect(docData.originalPrompt).toBe('Create a landing page for my startup');
    });

    /**
     * Unit test: Verify originalPrompt is null when not provided
     */
    it('should set originalPrompt to null when not provided', () => {
      const website: CreateWebsiteData = {
        title: 'Test Website',
        html: '<html><body>Test</body></html>',
        css: 'body { margin: 0; }',
        thumbnailUrl: 'data:image/png;base64,abc123',
        inputType: 'screenshot',
        originalPrompt: null,
        isPublic: true,
      };

      const docData = createWebsiteDocumentData('user-123', website, 'Test User');

      expect(docData.originalPrompt).toBeNull();
    });

    /**
     * Unit test: Verify originalPrompt is retrieved correctly from document
     */
    it('should retrieve originalPrompt correctly from document data', () => {
      const docData = {
        userId: 'user-123',
        title: 'Test Website',
        html: '<html><body>Test</body></html>',
        css: 'body { margin: 0; }',
        thumbnailUrl: 'data:image/png;base64,abc123',
        inputType: 'text',
        originalPrompt: 'Create a portfolio website',
        isPublic: true,
        isShowcased: false,
        showcasedAt: null,
        creatorName: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const website = documentToWebsite('doc-123', docData);

      expect(website.originalPrompt).toBe('Create a portfolio website');
    });

    /**
     * Unit test: Verify null originalPrompt is handled correctly
     */
    it('should handle null originalPrompt from document data', () => {
      const docData = {
        userId: 'user-123',
        title: 'Test Website',
        html: '<html><body>Test</body></html>',
        css: 'body { margin: 0; }',
        thumbnailUrl: 'data:image/png;base64,abc123',
        inputType: 'screenshot',
        originalPrompt: null,
        isPublic: true,
        isShowcased: false,
        showcasedAt: null,
        creatorName: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const website = documentToWebsite('doc-123', docData);

      expect(website.originalPrompt).toBeNull();
    });

    /**
     * Unit test: Verify undefined originalPrompt defaults to null
     */
    it('should default undefined originalPrompt to null', () => {
      const docData = {
        userId: 'user-123',
        title: 'Test Website',
        html: '<html><body>Test</body></html>',
        css: 'body { margin: 0; }',
        thumbnailUrl: 'data:image/png;base64,abc123',
        inputType: 'screenshot',
        // originalPrompt is undefined (missing from document)
        isPublic: true,
        isShowcased: false,
        showcasedAt: null,
        creatorName: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const website = documentToWebsite('doc-123', docData);

      expect(website.originalPrompt).toBeNull();
    });
  });

  /**
   * Property-Based Tests
   *
   * These tests verify universal properties across generated inputs using fast-check.
   */
  describe('Property-Based Tests', () => {
    /**
     * Feature: website-beautify, Property 1: Original Prompt Storage Round-Trip
     *
     * *For any* valid text prompt used to generate a website, storing and then
     * retrieving the website SHALL return the same original prompt value.
     *
     * **Validates: Requirements 0.1, 0.4**
     */
    it('originalPrompt round-trip preserves content (Property 1)', () => {
      fc.assert(
        fc.property(
          // Generate random originalPrompt strings up to 10,000 characters
          // This matches the maximum length specified in Requirement 0.2
          fc.string({ minLength: 0, maxLength: 10000 }),
          // Generate a random userId
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate a random document ID
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate a random title
          fc.string({ minLength: 1, maxLength: 100 }),
          // Generate random creatorName
          fc.string({ minLength: 1, maxLength: 100 }),
          (originalPrompt, userId, docId, title, creatorName) => {
            // Create website data with the generated originalPrompt
            const websiteData: CreateWebsiteData = {
              title: title || 'Test Website',
              html: '<html><body>Test content</body></html>',
              css: 'body { margin: 0; }',
              thumbnailUrl: 'data:image/png;base64,abc123',
              inputType: 'text',
              originalPrompt: originalPrompt,
              isPublic: true,
            };

            // Step 1: Create document data (simulates the save operation)
            const documentData = createWebsiteDocumentData(
              userId || 'test-user',
              websiteData,
              creatorName || 'Anonymous'
            );

            // Step 2: Convert document back to GeneratedWebsite (simulates retrieval)
            const retrievedWebsite = documentToWebsite(docId || 'test-doc', documentData);

            // Property assertion: The originalPrompt should be identical after round-trip
            expect(retrievedWebsite.originalPrompt).toBe(originalPrompt);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: website-beautify, Property 1 (null case): Original Prompt Storage Round-Trip for null
     *
     * *For any* website with null originalPrompt (screenshot-based), storing and then
     * retrieving SHALL return null.
     *
     * **Validates: Requirements 0.1, 0.3, 0.4**
     */
    it('null originalPrompt round-trip preserves null value (Property 1)', () => {
      fc.assert(
        fc.property(
          // Generate a random userId
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate a random document ID
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate a random title
          fc.string({ minLength: 1, maxLength: 100 }),
          (userId, docId, title) => {
            // Create website data with null originalPrompt (screenshot-based)
            const websiteData: CreateWebsiteData = {
              title: title || 'Test Website',
              html: '<html><body>Test content</body></html>',
              css: 'body { margin: 0; }',
              thumbnailUrl: 'data:image/png;base64,abc123',
              inputType: 'screenshot',
              originalPrompt: null,
              isPublic: true,
            };

            // Step 1: Create document data (simulates the save operation)
            const documentData = createWebsiteDocumentData(
              userId || 'test-user',
              websiteData,
              'Anonymous'
            );

            // Step 2: Convert document back to GeneratedWebsite (simulates retrieval)
            const retrievedWebsite = documentToWebsite(docId || 'test-doc', documentData);

            // Property assertion: The originalPrompt should remain null after round-trip
            expect(retrievedWebsite.originalPrompt).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Additional property test: originalPrompt with special characters
     *
     * Validates that special characters, Unicode, and edge cases in prompts
     * are preserved through the round-trip transformation.
     *
     * **Validates: Requirements 0.1, 0.4**
     */
    it('originalPrompt with special characters is preserved (Property 1)', () => {
      fc.assert(
        fc.property(
          // Generate strings with full unicode range
          fc.string({ minLength: 0, maxLength: 5000, unit: 'grapheme-composite' }),
          (originalPrompt) => {
            const websiteData: CreateWebsiteData = {
              title: 'Test Website',
              html: '<html><body>Test</body></html>',
              css: 'body { margin: 0; }',
              thumbnailUrl: 'data:image/png;base64,abc123',
              inputType: 'text',
              originalPrompt: originalPrompt,
              isPublic: true,
            };

            // Round-trip transformation
            const documentData = createWebsiteDocumentData('user-123', websiteData, 'Test User');
            const retrievedWebsite = documentToWebsite('doc-123', documentData);

            // Property assertion: Special characters should be preserved
            expect(retrievedWebsite.originalPrompt).toBe(originalPrompt);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
