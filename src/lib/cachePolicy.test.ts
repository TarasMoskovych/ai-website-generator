/**
 * Property-based tests for cache staleness policy.
 *
 * Feature: server-side-rendering-migration, Property 2: Cache staleness policy correctly enforces 24-hour boundary
 *
 * Validates: Requirements 6.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldServeStaleCacheContent } from './cachePolicy';

const STALENESS_LIMIT_SECONDS = 86400; // 24 hours
const MAX_CACHE_AGE = 172800; // 48 hours (test range upper bound)

describe('Feature: server-side-rendering-migration, Property 2: Cache staleness policy correctly enforces 24-hour boundary', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * When cacheAge < 86400 seconds (24 hours) and revalidation has failed,
   * the policy SHALL serve stale cached content.
   */
  it('serves stale content when cache age is below 24 hours and revalidation failed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: STALENESS_LIMIT_SECONDS - 1 }),
        (cacheAge) => {
          const decision = shouldServeStaleCacheContent(cacheAge, false);
          expect(decision).toBe('serve-stale');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.4**
   *
   * When cacheAge >= 86400 seconds (24 hours), the policy SHALL attempt
   * a fresh server render regardless of revalidation outcome.
   */
  it('attempts fresh render when cache age equals or exceeds 24 hours regardless of revalidation outcome', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: STALENESS_LIMIT_SECONDS, max: MAX_CACHE_AGE }),
        fc.boolean(),
        (cacheAge, revalidationSuccess) => {
          const decision = shouldServeStaleCacheContent(cacheAge, revalidationSuccess);
          expect(decision).toBe('attempt-fresh');
        },
      ),
      { numRuns: 100 },
    );
  });
});
