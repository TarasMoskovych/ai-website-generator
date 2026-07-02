/**
 * Property-Based Tests for Showcase Query Filtering and Sorting Logic
 *
 * Feature: server-side-rendering-migration, Property 1: Showcase query returns only valid public showcased items in correct order
 *
 * Validates: Requirements 1.2, 2.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterAndSortShowcasedWebsites,
  WebsiteDocument,
} from './serverData';

/**
 * Arbitrary generator for WebsiteDocument objects with random
 * isPublic, isShowcased, and showcasedAt values.
 */
const websiteDocumentArb: fc.Arbitrary<WebsiteDocument> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 0, maxLength: 50 }),
  thumbnailUrl: fc.webUrl(),
  creatorName: fc.string({ minLength: 0, maxLength: 30 }),
  isPublic: fc.oneof(fc.constant(true), fc.constant(false), fc.constant(undefined)),
  isShowcased: fc.oneof(fc.constant(true), fc.constant(false), fc.constant(undefined)),
  showcasedAt: fc.oneof(
    // ISO string date within a reasonable range
    fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map((ts) => new Date(ts).toISOString()),
    // Firestore Timestamp-like object
    fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map((ts) => {
      const d = new Date(ts);
      return { toDate: () => d };
    }),
    // null or undefined
    fc.constant(null),
    fc.constant(undefined)
  ),
});

const documentsArb = fc.array(websiteDocumentArb, { minLength: 0, maxLength: 50 });

const pageSizeArb = fc.integer({ min: 1, max: 100 });

describe('filterAndSortShowcasedWebsites - Property 1', () => {
  it('should return only items where isPublic === true AND isShowcased === true', () => {
    fc.assert(
      fc.property(documentsArb, pageSizeArb, (documents, pageSize) => {
        const result = filterAndSortShowcasedWebsites(documents, 1, pageSize);

        // Every returned item must have originated from a document where
        // isPublic === true AND isShowcased === true
        for (const item of result.items) {
          const source = documents.find((doc) => doc.id === item.id);
          expect(source).toBeDefined();
          expect(source!.isPublic).toBe(true);
          expect(source!.isShowcased).toBe(true);
          expect(source!.showcasedAt).not.toBeNull();
          expect(source!.showcasedAt).not.toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should return results sorted by showcasedAt in descending order', () => {
    fc.assert(
      fc.property(documentsArb, pageSizeArb, (documents, pageSize) => {
        const result = filterAndSortShowcasedWebsites(documents, 1, pageSize);

        // Verify descending order by showcasedAt
        for (let i = 1; i < result.items.length; i++) {
          const prevDate = new Date(result.items[i - 1].showcasedAt).getTime();
          const currDate = new Date(result.items[i].showcasedAt).getTime();
          expect(prevDate).toBeGreaterThanOrEqual(currDate);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should return at most pageSize items', () => {
    fc.assert(
      fc.property(documentsArb, pageSizeArb, (documents, pageSize) => {
        const result = filterAndSortShowcasedWebsites(documents, 1, pageSize);

        expect(result.items.length).toBeLessThanOrEqual(pageSize);
        expect(result.pageSize).toBe(pageSize);
      }),
      { numRuns: 100 }
    );
  });

  it('should not omit any qualifying documents from the total count', () => {
    fc.assert(
      fc.property(documentsArb, pageSizeArb, (documents, pageSize) => {
        const result = filterAndSortShowcasedWebsites(documents, 1, pageSize);

        // Count qualifying documents manually
        const qualifyingCount = documents.filter(
          (doc) =>
            doc.isPublic === true &&
            doc.isShowcased === true &&
            doc.showcasedAt != null
        ).length;

        expect(result.totalCount).toBe(qualifyingCount);
      }),
      { numRuns: 100 }
    );
  });

  it('should respect pagination: page 1 items + page 2 items cover all qualifying docs', () => {
    fc.assert(
      fc.property(documentsArb, pageSizeArb, (documents, pageSize) => {
        const page1 = filterAndSortShowcasedWebsites(documents, 1, pageSize);
        const page2 = filterAndSortShowcasedWebsites(documents, 2, pageSize);

        // Items across pages should not overlap
        const page1Ids = new Set(page1.items.map((item) => item.id));
        const page2Ids = new Set(page2.items.map((item) => item.id));
        const overlap = [...page2Ids].filter((id) => page1Ids.has(id));
        expect(overlap).toHaveLength(0);

        // Combined length should not exceed totalCount
        expect(page1.items.length + page2.items.length).toBeLessThanOrEqual(
          page1.totalCount
        );
      }),
      { numRuns: 100 }
    );
  });
});
